#!/usr/bin/env node
/**
 * seed-capstone-day.mjs
 *
 * Creates:
 *   - Coordinator: capstone.coord@vsms.foo
 *   - Organization: Conestoga College
 *   - Opportunity: Capstone Day - Waterloo Campus
 *   - Shift: April 15, 2026 8:30 AM – 12:30 PM (EDT / UTC-4)
 *   - Geofence: Conestoga College Waterloo Campus (43.4680, -80.5175, 500m)
 *
 * Usage:
 *   node tools/seed-capstone-day.mjs --base-url http://10.20.30.2:8080
 */

const BASE_URL = process.argv.find((_, i, a) => a[i - 1] === "--base-url") ?? "http://localhost:8080";
const ADMIN_EMAIL = process.argv.find((_, i, a) => a[i - 1] === "--admin-email") ?? "admin@vsms.com";
const ADMIN_PASSWORD = process.argv.find((_, i, a) => a[i - 1] === "--admin-password") ?? "Admin@123";
const COORD_EMAIL = "capstone.coord@vsms.foo";
const COORD_PASSWORD = "Capstone@123_";

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
  console.log(`Target: ${BASE_URL}`);

  // 1. Login admin
  console.log("Logging in admin...");
  const adminLogin = await api("POST", "/api/auth/login", {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    expected: [200],
  });
  const adminToken = get(adminLogin.data, "token", "Token");

  // 2. Register coordinator
  console.log(`Registering coordinator: ${COORD_EMAIL}`);
  try {
    await api("POST", "/api/auth/register", {
      body: {
        email: COORD_EMAIL,
        password: COORD_PASSWORD,
        firstName: "Chunxi",
        lastName: "Zhang",
        role: "Coordinator",
      },
      expected: [200, 201],
    });
  } catch (err) {
    console.log(`  (may already exist: ${err.message})`);
  }

  // 3. Login coordinator
  console.log("Logging in coordinator...");
  const coordLogin = await api("POST", "/api/auth/login", {
    body: { email: COORD_EMAIL, password: COORD_PASSWORD },
    expected: [200],
  });
  const coordToken = get(coordLogin.data, "token", "Token");
  const coordUserId = get(coordLogin.data, "userId", "UserId");
  const coordGrainId = get(coordLogin.data, "linkedGrainId", "LinkedGrainId");
  console.log(`  userId: ${coordUserId}`);
  console.log(`  grainId: ${coordGrainId}`);

  // 4. Create organization: Conestoga College
  console.log("Creating organization: Conestoga College...");
  let orgId;
  try {
    const orgRes = await api("POST", "/api/organizations", {
      token: coordToken,
      body: {
        name: "Conestoga College",
        description: "Conestoga College is a leader in polytechnic education, providing career-focused programs in the Waterloo Region. Our volunteers support campus events, community outreach, and student success initiatives.",
        creatorUserId: coordUserId,
        creatorEmail: COORD_EMAIL,
        proofUrl: "https://www.conestogac.on.ca",
      },
      expected: [201],
    });
    orgId = get(orgRes.data, "orgId", "OrgId");
  } catch (err) {
    console.log(`  Organization may already exist: ${err.message}`);
    // Try to find existing org
    const orgsRes = await api("GET", "/api/organizations?status=0&skip=0&take=100", {
      token: adminToken,
      expected: [200],
    });
    const existing = (Array.isArray(orgsRes.data) ? orgsRes.data : []).find(
      (o) => o.name === "Conestoga College" || o.Name === "Conestoga College"
    );
    if (existing) {
      orgId = get(existing, "orgId", "OrgId");
      console.log(`  Found existing org: ${orgId}`);
    } else {
      throw new Error("Cannot find or create Conestoga College organization.");
    }
  }
  console.log(`  orgId: ${orgId}`);

  // 5. Approve organization
  console.log("Approving organization...");
  try {
    await api("POST", `/api/admin/organizations/${orgId}/approve`, {
      token: adminToken,
      expected: [204],
    });
    console.log("  Approved ✓");
  } catch {
    console.log("  (may already be approved)");
  }

  // 6. Update org profile
  console.log("Updating org profile...");
  try {
    await api("PUT", `/api/organizations/${orgId}/profile`, {
      token: coordToken,
      body: {
        websiteUrl: "https://www.conestogac.on.ca",
        contactEmail: "info@conestogac.on.ca",
        tags: ["Education", "Technology", "Community", "Capstone"],
      },
      expected: [204],
    });
  } catch (err) {
    console.log(`  Profile update skipped: ${err.message}`);
  }

  // 7. Create opportunity: Capstone Day
  console.log("Creating opportunity: Capstone Day - Waterloo Campus...");
  const oppRes = await api("POST", `/api/organizations/${orgId}/opportunities`, {
    token: coordToken,
    body: {
      title: "Capstone Day - Waterloo Campus",
      description: "Join us for Capstone Day at Conestoga College Waterloo Campus! Students will be presenting their final capstone projects. Volunteers are needed for event setup, registration desk, tech support, and guiding visitors. This is a great opportunity to support student innovation and connect with the local tech community.",
      category: "Education",
    },
    expected: [201],
  });
  const oppId = get(oppRes.data, "opportunityId", "OpportunityId");
  console.log(`  opportunityId: ${oppId}`);

  // 8. Set geofence: Conestoga College Waterloo Campus
  //    Radius set to 2km for live demo flexibility
  console.log("Setting geofence: Conestoga College - Waterloo...");
  await api("POST", `/api/opportunities/${oppId}/geofence`, {
    token: coordToken,
    body: {
      lat: 43.479554,
      lon: -80.518072,
      radiusMeters: 400,
    },
    expected: [204],
  });
  console.log("  Geofence set ✓ (43.479554, -80.518072, 400m)");

  // 9. Add shift: April 15, 2026 8:30 AM - 12:30 PM EDT (UTC-4)
  //    EDT = UTC-4, so 8:30 AM EDT = 12:30 PM UTC, 12:30 PM EDT = 4:30 PM UTC
  console.log("Adding shift: April 15, 2026 8:30 AM – 12:30 PM EDT...");
  await api("POST", `/api/opportunities/${oppId}/shifts`, {
    token: coordToken,
    body: {
      name: "Capstone Day - Morning Session",
      startTime: "2026-04-15T12:30:00Z",  // 8:30 AM EDT
      endTime: "2026-04-15T16:30:00Z",    // 12:30 PM EDT
      maxCapacity: 300,
    },
    expected: [204],
  });
  console.log("  Shift added ✓");

  // 10. Set required skills
  console.log("Setting required skills...");
  try {
    const skillsRes = await api("GET", "/api/skills", {
      token: adminToken,
      expected: [200],
    });
    const skills = Array.isArray(skillsRes.data) ? skillsRes.data : [];
    const wanted = ["Event Setup", "Basic IT Support"];
    const skillIds = skills
      .filter((s) => wanted.includes(s.name ?? s.Name))
      .map((s) => s.id ?? s.Id);
    if (skillIds.length > 0) {
      await api("PUT", `/api/opportunities/${oppId}/skills`, {
        token: coordToken,
        body: { skillIds },
        expected: [204],
      });
      console.log(`  Skills set: ${skillIds.length} skills ✓`);
    }
  } catch (err) {
    console.log(`  Skills skipped: ${err.message}`);
  }

  // 11. Publish
  console.log("Publishing opportunity...");
  await api("POST", `/api/opportunities/${oppId}/publish`, {
    token: coordToken,
    expected: [204],
  });
  console.log("  Published ✓");

  // 12. Post announcement
  console.log("Posting announcement...");
  await api("POST", `/api/organizations/${orgId}/announcements`, {
    token: coordToken,
    body: {
      text: "🎓 Capstone Day is coming on April 15! We need volunteers for event setup, registration, and tech support at the Waterloo Campus. Sign up now!",
    },
    expected: [204],
  });
  console.log("  Announcement posted ✓");

  // 13. Create certificate template for Conestoga College
  console.log("Creating certificate template: Conestoga College Capstone Certificate...");
  let templateId;
  try {
    const templateRes = await api("POST", "/api/certificates/templates", {
      token: coordToken,
      body: {
        name: "Conestoga Capstone Day 2026 — Limited Edition",
        description: "Limited edition certificate exclusively awarded to volunteers who participated in the inaugural Capstone Day at Conestoga College Waterloo Campus on April 15, 2026.",
        organizationId: orgId,
        organizationName: "Conestoga College",
        templateType: "achievement_certificate",
        primaryColor: "#003366",
        accentColor: "#FFB81C",
        titleText: "Limited Edition — Certificate of Participation",
        bodyTemplate: "This limited edition certificate is proudly awarded to {volunteerName} in recognition of their outstanding contribution as a volunteer at the inaugural Capstone Day 2026, held at Conestoga College Waterloo Campus on April 15, 2026. Total service: {totalHours} hours.",
        signatoryName: "Chunxi Zhang",
        signatoryTitle: "Capstone Project Coordinator, Conestoga College",
      },
      expected: [201],
    });
    templateId = get(templateRes.data, "id", "Id");
    console.log(`  Template created ✓ (${templateId})`);
  } catch (err) {
    console.log(`  Template creation skipped: ${err.message}`);
  }

  console.log("\n=== Capstone Day Seed Complete ===");
  console.log(`Organization:  Conestoga College (${orgId})`);
  console.log(`Opportunity:   Capstone Day - Waterloo Campus (${oppId})`);
  console.log(`Shift:         April 15, 2026 8:30 AM – 12:30 PM EDT`);
  console.log(`Location:      Conestoga College Waterloo Campus (43.4680, -80.5175)`);
  console.log(`Geofence:      500m radius`);
  console.log(`Certificate:   Conestoga College Capstone Certificate (${templateId ?? "N/A"})`);
  console.log(`Coordinator:   ${COORD_EMAIL} / ${COORD_PASSWORD}`);
  console.log(`\n--- Live Demo Flow ---`);
  console.log(`1. Volunteers register at the app (any email)`);
  console.log(`2. Browse → Find "Capstone Day - Waterloo Campus" → Apply`);
  console.log(`3. Coordinator (${COORD_EMAIL}) approves applications`);
  console.log(`4. Volunteers check in on-site (Geo or QR)`);
  console.log(`5. Coordinator confirms attendance`);
  console.log(`6. Volunteers generate & download certificate 🏆`);
}

main().catch((err) => {
  console.error("[fatal]", err.message);
  process.exitCode = 1;
});
