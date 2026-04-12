#!/usr/bin/env node
/**
 * capstone-finalize.mjs
 *
 * Post-demo batch tool: for ALL Capstone Day attendance records,
 *   1. Manual-adjust check-in/out to the full shift window (8:30 AM – 12:30 PM EDT)
 *   2. Confirm each record → triggers grain hour updates
 *
 * This ensures every volunteer gets the full 4-hour credit regardless of
 * how briefly they checked in/out during the live demo.
 *
 * Usage:
 *   node tools/capstone-finalize.mjs --base-url http://10.20.30.2:8080
 *
 * Options:
 *   --hours <N>    Override total hours (default: 4, the full shift)
 *   --dry-run      Show what would happen without making changes
 */

const BASE_URL = process.argv.find((_, i, a) => a[i - 1] === "--base-url") ?? "http://localhost:8080";
const COORD_EMAIL = "capstone.coord@vsms.foo";
const COORD_PASSWORD = "Capstone@123_";
const OVERRIDE_HOURS = parseFloat(process.argv.find((_, i, a) => a[i - 1] === "--hours") ?? "4");
const DRY_RUN = process.argv.includes("--dry-run");

// Shift window: April 15, 2026 8:30 AM – 12:30 PM EDT (UTC-4)
const SHIFT_START = "2026-04-15T12:30:00Z"; // 8:30 AM EDT
const SHIFT_END   = "2026-04-15T16:30:00Z"; // 12:30 PM EDT

async function api(method, path, { token, body, expected } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (expected && !expected.includes(res.status)) {
    throw new Error(`${method} ${path} -> ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return { status: res.status, data };
}

function get(obj, ...keys) {
  for (const k of keys) { if (obj?.[k] !== undefined) return obj[k]; }
  return undefined;
}

async function main() {
  console.log("=== Capstone Day Finalize ===");
  console.log(`Target: ${BASE_URL}`);
  console.log(`Override hours: ${OVERRIDE_HOURS}`);
  if (DRY_RUN) console.log("*** DRY RUN — no changes will be made ***\n");

  // 1. Login coordinator
  console.log(`Logging in: ${COORD_EMAIL}`);
  const login = await api("POST", "/api/auth/login", {
    body: { email: COORD_EMAIL, password: COORD_PASSWORD },
    expected: [200],
  });
  const token = get(login.data, "token", "Token");
  const coordGrainId = get(login.data, "linkedGrainId", "LinkedGrainId");
  console.log(`  Coordinator grainId: ${coordGrainId}`);

  // 2. Find Capstone Day opportunity from coordinator's org
  console.log("Finding Capstone Day opportunity...");
  const orgsRes = await api("GET", `/api/coordinators/${coordGrainId}/organizations`, {
    token,
    expected: [200],
  });
  const orgs = Array.isArray(orgsRes.data) ? orgsRes.data : [];
  let oppId = null;

  for (const org of orgs) {
    const orgId = get(org, "orgId", "OrgId", "id", "Id");
    const oppsRes = await api("GET", `/api/organizations/${orgId}/opportunities`, {
      token,
      expected: [200],
    });
    const opps = Array.isArray(oppsRes.data) ? oppsRes.data : [];
    const capstone = opps.find(o =>
      (get(o, "title", "Title") || "").includes("Capstone Day")
    );
    if (capstone) {
      oppId = get(capstone, "opportunityId", "OpportunityId", "id", "Id");
      break;
    }
  }

  if (!oppId) {
    console.error("Could not find Capstone Day opportunity!");
    process.exitCode = 1;
    return;
  }
  console.log(`  Found opportunity: ${oppId}`);

  // 3. Get all applications for this opportunity
  console.log("Fetching applications...");
  const appsRes = await api("GET", `/api/opportunities/${oppId}/applications`, {
    token,
    expected: [200],
  });
  const apps = Array.isArray(appsRes.data) ? appsRes.data : [];
  const approvedApps = apps.filter(a => {
    const status = get(a, "status", "Status");
    return status === "Approved" || status === "Completed";
  });
  console.log(`  Total applications: ${apps.length}, approved/completed: ${approvedApps.length}`);

  // 4. Collect attendance records for each approved application
  console.log("Fetching attendance records...");
  const records = [];
  for (const app of approvedApps) {
    const appId = get(app, "applicationId", "ApplicationId", "id", "Id");
    const volId = get(app, "volunteerId", "VolunteerId");
    const volName = get(app, "volunteerName", "VolunteerName") || volId;

    try {
      const attRes = await api("GET", `/api/attendance/by-application/${appId}`, {
        token,
        expected: [200],
      });
      if (attRes.data) {
        const attId = get(attRes.data, "attendanceId", "AttendanceId", "id", "Id");
        const status = get(attRes.data, "status", "Status");
        const totalHours = get(attRes.data, "totalHours", "TotalHours") ?? 0;
        if (attId) {
          records.push({ attId, appId, volId, volName, status, totalHours });
        }
      }
    } catch {
      // No attendance record for this application
    }
  }
  console.log(`  Found ${records.length} attendance records\n`);

  // 5. Process each record
  // Compute adjusted check-in/out from shift times
  const adjustedCheckIn = SHIFT_START;
  // Calculate checkout based on override hours
  const checkInDate = new Date(SHIFT_START);
  const adjustedCheckOut = new Date(checkInDate.getTime() + OVERRIDE_HOURS * 3600000).toISOString();

  let adjusted = 0;
  let confirmed = 0;
  let skipped = 0;

  for (const rec of records) {
    const label = `[${rec.volName}] (${rec.attId.slice(0, 8)})`;

    // Skip if already Confirmed with enough hours
    if (rec.status === "Confirmed" && rec.totalHours >= OVERRIDE_HOURS - 0.1) {
      console.log(`  ✓ ${label} — already confirmed with ${rec.totalHours}h, skipping`);
      skipped++;
      continue;
    }

    // Step A: Manual Adjustment → set full shift hours
    if (rec.status !== "Confirmed") {
      console.log(`  ⏱ ${label} — adjusting to ${OVERRIDE_HOURS}h (${rec.status}, was ${rec.totalHours}h)`);
      if (!DRY_RUN) {
        try {
          await api("POST", `/api/attendance/${rec.attId}/adjust`, {
            token,
            body: {
              coordinatorId: coordGrainId,
              newCheckIn: adjustedCheckIn,
              newCheckOut: adjustedCheckOut,
              reason: `Capstone Day full-shift credit (${OVERRIDE_HOURS}h)`,
            },
            expected: [204],
          });
          adjusted++;
        } catch (err) {
          console.log(`    ⚠ Adjust failed: ${err.message}`);
          continue;
        }
      } else {
        adjusted++;
      }
    }

    // Step B: Confirm
    if (rec.status !== "Confirmed") {
      console.log(`  ✅ ${label} — confirming...`);
      if (!DRY_RUN) {
        try {
          await api("POST", `/api/attendance/${rec.attId}/confirm`, {
            token,
            body: {
              coordinatorId: coordGrainId,
              rating: 5,
            },
            expected: [204],
          });
          confirmed++;
        } catch (err) {
          console.log(`    ⚠ Confirm failed: ${err.message}`);
        }
      } else {
        confirmed++;
      }
    }
  }

  console.log(`\n=== Finalize Complete ===`);
  console.log(`  Adjusted: ${adjusted}`);
  console.log(`  Confirmed: ${confirmed}`);
  console.log(`  Skipped (already done): ${skipped}`);
  console.log(`  Total records: ${records.length}`);
  if (DRY_RUN) console.log(`\n⚠ This was a DRY RUN. Run without --dry-run to apply changes.`);
  else console.log(`\n🏆 All volunteers now have ${OVERRIDE_HOURS}h credited. They can download certificates!`);
}

main().catch((err) => {
  console.error("[fatal]", err.message);
  process.exitCode = 1;
});
