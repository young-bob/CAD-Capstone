#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const defaults = {
  baseUrl: "http://localhost:8080",
  adminEmail: "admin@vsms.com",
  adminPassword: "Admin@123",
  userPassword: "Pass@12345",
  coordinators: 3,
  volunteers: 24,
  opportunitiesPerOrg: 4,
  shiftsPerOpportunity: 2,
  applicationsPerOpportunity: 6,
  approveRate: 0.7,
  rejectRate: 0.15,
  attendanceFlows: 20,
  disputeRate: 0.25,
  checkinReadyRate: 0.85,
  longRunning: false,
  historyDays: 240,
  futureDays: 45,
  pastOpportunityRate: 0.75,
  ongoingOpportunityRate: 0.15,
  seedSkills: true,
  seedCertificates: true,
  seedWaivers: true,
  seedBackgroundChecks: true,
  seedFollows: true,
  seedAnnouncements: true,
  coordinatorCheckinRate: 0.3,
  incremental: false,
  runTag: "",
};

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const cur = argv[i];
    if (cur === "-h" || cur === "--help") {
      out.help = true;
      continue;
    }
    if (!cur.startsWith("--")) continue;
    const eq = cur.indexOf("=");
    if (eq >= 0) {
      out[cur.slice(2, eq)] = cur.slice(eq + 1);
      continue;
    }
    const key = cur.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = "true";
      continue;
    }
    out[key] = next;
    i += 1;
  }
  return out;
}

function asInt(v, fallback) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function asFloat(v, fallback) {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function asBool(v, fallback) {
  if (v === undefined) return fallback;
  const t = String(v).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(t)) return true;
  if (["0", "false", "no", "n", "off"].includes(t)) return false;
  return fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function choose(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sampleWithoutReplacement(arr, count) {
  if (count >= arr.length) return [...arr];
  const pool = [...arr];
  const out = [];
  while (out.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

function toIso(date) {
  return new Date(date).toISOString();
}

function parseIsoMs(value) {
  const n = Date.parse(value);
  return Number.isFinite(n) ? n : null;
}

function isCheckinReadyByShiftStart(startTimeIso, nowMs = Date.now()) {
  const startMs = parseIsoMs(startTimeIso);
  if (startMs === null) return false;
  return nowMs >= (startMs - 30 * 60 * 1000);
}

function randHex(size = 6) {
  return crypto.randomBytes(size).toString("hex");
}

function randInt(min, max) {
  if (max <= min) return min;
  return min + Math.floor(Math.random() * (max - min + 1));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function get(obj, ...keys) {
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
  }
  return undefined;
}

function normalizeAuth(resp) {
  const token = get(resp, "token", "Token");
  const email = get(resp, "email", "Email");
  const role = get(resp, "role", "Role");
  const userId = get(resp, "userId", "UserId");
  const linkedGrainId = get(resp, "linkedGrainId", "LinkedGrainId");
  if (!token || !userId || !linkedGrainId) {
    throw new Error(`Auth response missing fields: ${JSON.stringify(resp)}`);
  }
  return { token, email, role, userId, linkedGrainId };
}

function printHelp() {
  console.log(`
Usage:
  node tools/seed-debug-data.mjs [options]

Options:
  --base-url <url>                    API base URL (default: ${defaults.baseUrl})
  --admin-email <email>               Admin account (default: ${defaults.adminEmail})
  --admin-password <password>         Admin password (default: ${defaults.adminPassword})
  --user-password <password>          Generated test user password (default: ${defaults.userPassword})

  --coordinators <n>                  Number of coordinator users (default: ${defaults.coordinators})
  --volunteers <n>                    Number of volunteer users (default: ${defaults.volunteers})
  --opportunities-per-org <n>         Opportunities per organization (default: ${defaults.opportunitiesPerOrg})
  --shifts-per-opportunity <n>        Shifts per opportunity (default: ${defaults.shiftsPerOpportunity})
  --applications-per-opportunity <n>  Applications per opportunity (default: ${defaults.applicationsPerOpportunity})

  --approve-rate <0..1>               Ratio of applications approved (default: ${defaults.approveRate})
  --reject-rate <0..1>                Ratio of applications rejected (default: ${defaults.rejectRate})
  --attendance-flows <n>              Number of approved applications to run checkin/checkout on (default: ${defaults.attendanceFlows})
  --dispute-rate <0..1>               Ratio of attendance records that raise dispute (default: ${defaults.disputeRate})
  --checkin-ready-rate <0..1>         Ratio of applications biased to checkin-ready shifts (default: ${defaults.checkinReadyRate})
  --long-running <true|false>         Generate historical timeline data (default: ${defaults.longRunning})
  --history-days <n>                  Historical range in days when long-running mode is on (default: ${defaults.historyDays})
  --future-days <n>                   Future range in days when long-running mode is on (default: ${defaults.futureDays})
  --past-opportunity-rate <0..1>      Share of opportunities placed in the past timeline (default: ${defaults.pastOpportunityRate})
  --ongoing-opportunity-rate <0..1>   Share of opportunities placed near current time (default: ${defaults.ongoingOpportunityRate})

  --seed-skills <true|false>          Seed skill catalog + assign skills (default: ${defaults.seedSkills})
  --seed-certificates <true|false>    Seed certificate presets (default: ${defaults.seedCertificates})
  --seed-waivers <true|false>         Sign waivers for volunteers (default: ${defaults.seedWaivers})
  --seed-background-checks <true|false> Set background check status (default: ${defaults.seedBackgroundChecks})
  --seed-follows <true|false>         Volunteers follow random organizations (default: ${defaults.seedFollows})
  --seed-announcements <true|false>   Post announcements from coordinators (default: ${defaults.seedAnnouncements})
  --coordinator-checkin-rate <0..1>   Ratio of attendance using coordinator check-in (default: ${defaults.coordinatorCheckinRate})
  --incremental <true|false>          Reuse users from data/debug-seed/latest.json and top-up to target counts (default: ${defaults.incremental})
  --run-tag <text>                    Optional tag in generated account emails
  --help                              Show this help

Output:
  Writes generated credentials/data to:
    data/debug-seed/latest.json
    data/debug-seed/seed-<runId>.json
`);
}

const argMap = parseArgs(process.argv.slice(2));
if (argMap.help) {
  printHelp();
  process.exit(0);
}

const cfg = {
  baseUrl: String(argMap["base-url"] ?? defaults.baseUrl).replace(/\/+$/, ""),
  adminEmail: String(argMap["admin-email"] ?? defaults.adminEmail),
  adminPassword: String(argMap["admin-password"] ?? defaults.adminPassword),
  userPassword: String(argMap["user-password"] ?? defaults.userPassword),
  coordinators: Math.max(1, asInt(argMap.coordinators, defaults.coordinators)),
  volunteers: Math.max(1, asInt(argMap.volunteers, defaults.volunteers)),
  opportunitiesPerOrg: Math.max(1, asInt(argMap["opportunities-per-org"], defaults.opportunitiesPerOrg)),
  shiftsPerOpportunity: Math.max(1, asInt(argMap["shifts-per-opportunity"], defaults.shiftsPerOpportunity)),
  applicationsPerOpportunity: Math.max(1, asInt(argMap["applications-per-opportunity"], defaults.applicationsPerOpportunity)),
  approveRate: clamp(asFloat(argMap["approve-rate"], defaults.approveRate), 0, 1),
  rejectRate: clamp(asFloat(argMap["reject-rate"], defaults.rejectRate), 0, 1),
  attendanceFlows: Math.max(0, asInt(argMap["attendance-flows"], defaults.attendanceFlows)),
  disputeRate: clamp(asFloat(argMap["dispute-rate"], defaults.disputeRate), 0, 1),
  checkinReadyRate: clamp(asFloat(argMap["checkin-ready-rate"], defaults.checkinReadyRate), 0, 1),
  longRunning: asBool(argMap["long-running"], defaults.longRunning),
  historyDays: Math.max(1, asInt(argMap["history-days"], defaults.historyDays)),
  futureDays: Math.max(1, asInt(argMap["future-days"], defaults.futureDays)),
  pastOpportunityRate: clamp(asFloat(argMap["past-opportunity-rate"], defaults.pastOpportunityRate), 0, 1),
  ongoingOpportunityRate: clamp(asFloat(argMap["ongoing-opportunity-rate"], defaults.ongoingOpportunityRate), 0, 1),
  seedSkills: asBool(argMap["seed-skills"], defaults.seedSkills),
  seedCertificates: asBool(argMap["seed-certificates"], defaults.seedCertificates),
  seedWaivers: asBool(argMap["seed-waivers"], defaults.seedWaivers),
  seedBackgroundChecks: asBool(argMap["seed-background-checks"], defaults.seedBackgroundChecks),
  seedFollows: asBool(argMap["seed-follows"], defaults.seedFollows),
  seedAnnouncements: asBool(argMap["seed-announcements"], defaults.seedAnnouncements),
  coordinatorCheckinRate: clamp(asFloat(argMap["coordinator-checkin-rate"], defaults.coordinatorCheckinRate), 0, 1),
  incremental: asBool(argMap.incremental, defaults.incremental),
  runTag: String(argMap["run-tag"] ?? defaults.runTag).trim(),
};

if (cfg.approveRate + cfg.rejectRate > 1) {
  throw new Error("approve-rate + reject-rate must be <= 1");
}
if (cfg.pastOpportunityRate + cfg.ongoingOpportunityRate > 1) {
  throw new Error("past-opportunity-rate + ongoing-opportunity-rate must be <= 1");
}

const runId = `${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${randHex(3)}${cfg.runTag ? `-${cfg.runTag}` : ""}`;
const prefix = `seed.${runId}`;

const counters = {
  coordinators: 0,
  volunteers: 0,
  organizations: 0,
  approvedOrganizations: 0,
  opportunities: 0,
  shifts: 0,
  applications: 0,
  approvedApplications: 0,
  rejectedApplications: 0,
  attendanceCheckedInOut: 0,
  coordinatorCheckins: 0,
  disputesRaised: 0,
  disputesResolved: 0,
  skillsAssigned: 0,
  requiredSkillsSet: 0,
  waiversSigned: 0,
  backgroundChecksSet: 0,
  volunteerFollows: 0,
  announcementsPosted: 0,
  warnings: 0,
};

const memory = {
  coordinators: [],
  volunteers: [],
  organizations: [],
  opportunities: [],
  applications: [],
  approvedApps: [],
  skillCatalog: [],
};

const latestSnapshotPath = path.resolve("data", "debug-seed", "latest.json");

function info(msg) {
  console.log(`[seed] ${msg}`);
}

function warn(msg) {
  counters.warnings += 1;
  console.warn(`[seed][warn] ${msg}`);
}

class ApiError extends Error {
  constructor(method, pathName, status, payload) {
    super(`${method} ${pathName} -> ${status}`);
    this.method = method;
    this.pathName = pathName;
    this.status = status;
    this.payload = payload;
  }
}

async function withRetry(task, {
  retries = 10,
  delayMs = 400,
  retryOn = (err) => err instanceof ApiError && (err.status === 403 || err.status === 404),
} = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i += 1) {
    try {
      return await task();
    } catch (err) {
      lastErr = err;
      if (i >= retries || !retryOn(err)) break;
      await sleep(delayMs * (i + 1));
    }
  }
  throw lastErr;
}

async function api(method, pathName, { token, body, expected = [200] } = {}) {
  const url = `${cfg.baseUrl}${pathName}`;
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const raw = await res.text();
  let payload = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = raw;
    }
  }

  if (!expected.includes(res.status)) {
    throw new ApiError(method, pathName, res.status, payload);
  }
  return { status: res.status, data: payload };
}

async function loginAdmin() {
  info(`Logging in admin: ${cfg.adminEmail}`);
  const res = await api("POST", "/api/auth/login", {
    body: { email: cfg.adminEmail, password: cfg.adminPassword },
    expected: [200],
  });
  return normalizeAuth(res.data);
}

async function registerOrLogin(email, role, password, firstName = "Seeded", lastName = "User") {
  const reg = await api("POST", "/api/auth/register", {
    body: { email, password, firstName, lastName, role },
    expected: [201, 409],
  });
  if (reg.status === 201) return normalizeAuth(reg.data);
  const login = await api("POST", "/api/auth/login", {
    body: { email, password },
    expected: [200],
  });
  return normalizeAuth(login.data);
}

async function maybeSeedCertificates(admin) {
  if (!cfg.seedCertificates) return;
  try {
    await api("POST", "/api/certificates/seed-presets", {
      token: admin.token,
      expected: [200],
    });
    info("Certificate presets checked/seeded.");
  } catch (err) {
    // Endpoint may not exist in newer versions — safe to skip
    info(`Certificate seed-presets endpoint not available (${err.status ?? 'N/A'}), skipping.`);
  }
}

const skillTemplates = [
  ["Healthcare", "First Aid"],
  ["Healthcare", "CPR"],
  ["Community", "Event Support"],
  ["Community", "Youth Mentoring"],
  ["Community", "Elderly Care"],
  ["Education", "Tutoring"],
  ["Education", "Workshop Facilitation"],
  ["Environment", "Waste Sorting"],
  ["Environment", "Tree Planting"],
  ["Technology", "Basic IT Support"],
  ["Technology", "Data Entry"],
  ["Logistics", "Inventory Handling"],
  ["Logistics", "Transportation Coordination"],
  ["Language", "English Translation"],
  ["Language", "Mandarin Translation"],
];

const personFirstNames = [
  "Emma", "Olivia", "Ava", "Sophia", "Mia", "Charlotte", "Amelia", "Harper", "Ella", "Lily",
  "Noah", "Liam", "Ethan", "Mason", "Logan", "Lucas", "Benjamin", "James", "Alexander", "Henry",
  "Yuna", "Mina", "Leo", "Aria", "Nora", "Eli", "Zoe", "Ian", "Grace", "Ryan",
];

const personLastNames = [
  "Smith", "Johnson", "Brown", "Wilson", "Taylor", "Martin", "White", "Walker", "Hall", "Young",
  "Lee", "Chen", "Wang", "Li", "Zhang", "Liu", "Yang", "Patel", "Singh", "Kim",
];

const regionNames = [
  "Waterloo", "Kitchener", "Cambridge", "Guelph", "Conestoga", "Uptown", "Belmont Village", "Hespeler",
];

// Real Waterloo Region landmarks with precise coordinates
const waterlooLocations = [
  // Kitchener
  { name: "Kitchener City Hall", lat: 43.4516, lon: -80.4925 },
  { name: "Victoria Park - Kitchener", lat: 43.4490, lon: -80.4871 },
  { name: "Kitchener Market", lat: 43.4513, lon: -80.4860 },
  { name: "THEMUSEUM - Kitchener", lat: 43.4520, lon: -80.4925 },
  { name: "Breithaupt Centre", lat: 43.4571, lon: -80.4918 },
  { name: "Centre In The Square", lat: 43.4525, lon: -80.4900 },
  { name: "Kitchener Public Library", lat: 43.4530, lon: -80.4880 },
  { name: "Grand River Hospital", lat: 43.4494, lon: -80.5020 },
  { name: "Fairview Park Mall", lat: 43.4253, lon: -80.4493 },
  { name: "Bingemans Centre", lat: 43.4370, lon: -80.4443 },
  { name: "Rockway Community Centre", lat: 43.4410, lon: -80.4750 },
  { name: "Forest Heights Community Centre", lat: 43.4350, lon: -80.4670 },
  { name: "Stanley Park Community Centre", lat: 43.4610, lon: -80.4730 },
  { name: "Chandler Mowat Community Centre", lat: 43.4680, lon: -80.4850 },
  // Waterloo
  { name: "Waterloo Public Square", lat: 43.4643, lon: -80.5204 },
  { name: "Waterloo Memorial Rec Complex", lat: 43.4611, lon: -80.5192 },
  { name: "Conestoga Mall", lat: 43.4972, lon: -80.5290 },
  { name: "RIM Park", lat: 43.5085, lon: -80.5353 },
  { name: "University of Waterloo", lat: 43.4723, lon: -80.5449 },
  { name: "Wilfrid Laurier University", lat: 43.4738, lon: -80.5275 },
  { name: "Waterloo Town Square", lat: 43.4635, lon: -80.5220 },
  { name: "Albert McCormick Community Centre", lat: 43.4555, lon: -80.5340 },
  // Conestoga College
  { name: "Conestoga College - Doon", lat: 43.3895, lon: -80.4041 },
  { name: "Conestoga College - Waterloo", lat: 43.4795, lon: -80.5181 },
  // Cambridge
  { name: "Cambridge Idea Exchange", lat: 43.3601, lon: -80.3133 },
  { name: "Cambridge Centre Mall", lat: 43.3876, lon: -80.3412 },
  { name: "Hespeler Community Centre", lat: 43.4120, lon: -80.3120 },
  { name: "Preston Memorial Auditorium", lat: 43.3960, lon: -80.3540 },
  // Other
  { name: "Waterloo Region Museum", lat: 43.3834, lon: -80.3985 },
  { name: "St. Jacobs Farmers Market", lat: 43.5224, lon: -80.5565 },
];

function pickLocation() {
  const loc = choose(waterlooLocations);
  // Add small jitter ±0.002 (~200m) for realism
  return {
    lat: loc.lat + (Math.random() - 0.5) * 0.004,
    lon: loc.lon + (Math.random() - 0.5) * 0.004,
    name: loc.name,
  };
}

const orgPrefixWords = [
  "Harbor", "Maple", "Riverbend", "Northstar", "Sunrise", "Greenway", "Unity", "Bridgepoint", "Silverline", "Lakeside",
];

const orgFocusWords = [
  "Community", "Youth", "Family", "Senior", "Health", "Food", "Education", "Neighborhood", "Wellness", "Inclusion",
];

const orgTypeWords = [
  "Alliance", "Foundation", "Network", "Collective", "Society", "Center", "Initiative", "Association",
];

const shiftNameTemplates = [
  "Registration Desk",
  "Guest Check-in",
  "Set-up Crew",
  "Logistics Support",
  "Meal Service",
  "Outreach Team",
  "Activity Facilitator",
  "Resource Table",
  "Digital Support",
  "Closing Crew",
];

const opportunityTitleTemplates = {
  Community: [
    "Neighborhood Resource Fair",
    "Family Support Drop-in",
    "Weekend Community Kitchen",
    "Newcomer Welcome Session",
    "Community Food Drive",
    "Winter Clothing Collection",
  ],
  Environment: [
    "Grand River Cleanup Day",
    "Urban Tree Care Project",
    "Recycling Education Booth",
    "Laurel Creek Trail Restoration",
    "Victoria Park Revitalization",
  ],
  Education: [
    "After-school Homework Club",
    "Adult Digital Literacy Lab",
    "Career Readiness Workshop",
    "Community Tutoring Night",
    "Conestoga Skills Bootcamp",
  ],
  Health: [
    "Seniors Wellness Check-in",
    "Community Health Outreach",
    "Blood Pressure Screening Support",
    "Mental Wellness Resource Day",
    "Grand River Hospital Volunteer Day",
  ],
  Technology: [
    "Tech Help Desk for Seniors",
    "Device Setup Assistance Clinic",
    "Digital Skills Coaching Session",
    "Nonprofit Data Cleanup Sprint",
    "Code for Waterloo Hackathon",
  ],
};

const volunteerBioTemplates = [
  "Enjoys helping at community events and supporting neighborhood programs.",
  "Interested in public service, event operations, and volunteer leadership.",
  "Supports youth and family programs with a focus on consistent attendance.",
  "Brings strong communication skills and a collaborative working style.",
];

function normalizeForEmail(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function buildIdentity(role, sequence) {
  const firstName = choose(personFirstNames);
  const lastName = choose(personLastNames);
  const roleTag = role === "Coordinator" ? "coord" : "vol";
  const suffix = runId.slice(-6).replace(/[^a-z0-9]/gi, "").toLowerCase() || "seeded";
  const localPart = `${normalizeForEmail(firstName)}.${normalizeForEmail(lastName)}.${roleTag}${String(sequence + 1).padStart(3, "0")}.${suffix}`;
  return {
    firstName,
    lastName,
    email: `${localPart}@vsms.foo`,
  };
}

function buildPhoneNumber() {
  const areaCodes = ["226", "249", "289", "343", "365", "416", "437", "519", "647", "705", "905"];
  return `+1-${choose(areaCodes)}-${randInt(200, 999)}-${randInt(1000, 9999)}`;
}

function buildOrganizationName(index, coordinator) {
  const prefix = choose(orgPrefixWords);
  const focus = choose(orgFocusWords);
  const type = choose(orgTypeWords);
  const region = regionNames[index % regionNames.length];
  const lastName = coordinator?.lastName ? ` ${coordinator.lastName}` : "";
  return `${prefix}${lastName} ${focus} ${type} (${region})`;
}

function buildOpportunityDraft(category, orgName) {
  const templates = opportunityTitleTemplates[category] ?? opportunityTitleTemplates.Community;
  const baseTitle = choose(templates);
  const location = pickLocation();
  return {
    title: `${baseTitle} - ${location.name}`,
    description: `${orgName} is organizing ${baseTitle.toLowerCase()} at ${location.name} to support local residents in the Waterloo Region. Volunteers will assist with participant engagement, logistics, and on-site coordination.`,
    location,
  };
}

async function seedSkills(admin) {
  if (!cfg.seedSkills) return;
  const payload = skillTemplates.map(([category, name]) => ({
    category,
    name,
    description: `${name} capability for operational volunteering.`,
  }));

  await api("POST", "/api/skills/bulk", {
    token: admin.token,
    body: payload,
    expected: [200],
  });

  const list = await api("GET", "/api/skills", { expected: [200] });
  memory.skillCatalog = Array.isArray(list.data)
    ? list.data.map((s) => ({
      id: get(s, "id", "Id"),
      name: get(s, "name", "Name"),
      category: get(s, "category", "Category"),
    }))
    : [];
  info(`Skill catalog ready: ${memory.skillCatalog.length} skills.`);
}

async function preloadIncrementalUsers() {
  if (!cfg.incremental) return;

  let raw;
  try {
    raw = await fs.readFile(latestSnapshotPath, "utf8");
  } catch (err) {
    warn(`Incremental mode enabled but no latest snapshot found at ${latestSnapshotPath}. Starting fresh.`);
    return;
  }

  let snapshot;
  try {
    snapshot = JSON.parse(raw);
  } catch {
    warn(`Incremental mode enabled but snapshot is invalid JSON: ${latestSnapshotPath}. Starting fresh.`);
    return;
  }

  const snapshotBase = String(snapshot?.apiBaseUrl ?? "").replace(/\/+$/, "");
  if (snapshotBase && snapshotBase !== cfg.baseUrl) {
    warn(`Snapshot base URL ${snapshotBase} does not match current ${cfg.baseUrl}, skipping incremental preload.`);
    return;
  }

  const snapshotCoordinators = Array.isArray(snapshot?.coordinators) ? snapshot.coordinators : [];
  const snapshotVolunteers = Array.isArray(snapshot?.volunteers) ? snapshot.volunteers : [];
  info(`Incremental preload: try reusing up to ${cfg.coordinators} coordinators and ${cfg.volunteers} volunteers from latest snapshot...`);

  for (const item of snapshotCoordinators.slice(0, cfg.coordinators)) {
    const email = String(item?.email ?? "");
    if (!email) continue;
    const password = String(item?.password ?? cfg.userPassword);
    try {
      const login = await api("POST", "/api/auth/login", {
        body: { email, password },
        expected: [200],
      });
      const auth = normalizeAuth(login.data);
      memory.coordinators.push({
        ...auth,
        email,
        password,
        organizationId: get(item, "organizationId", "OrganizationId") ?? null,
        index: memory.coordinators.length,
      });
    } catch (err) {
      warn(`Incremental preload skipped coordinator ${email}: ${err.message}`);
    }
  }

  for (const item of snapshotVolunteers.slice(0, cfg.volunteers)) {
    const email = String(item?.email ?? "");
    if (!email) continue;
    const password = String(item?.password ?? cfg.userPassword);
    try {
      const login = await api("POST", "/api/auth/login", {
        body: { email, password },
        expected: [200],
      });
      const auth = normalizeAuth(login.data);
      const fullName = String(get(item, "fullName", "FullName") ?? "").trim();
      const nameParts = fullName ? fullName.split(/\s+/, 2) : [];
      memory.volunteers.push({
        ...auth,
        email,
        password,
        firstName: nameParts[0] ?? "Seeded",
        lastName: nameParts[1] ?? "Volunteer",
        skillIds: Array.isArray(get(item, "skillIds", "SkillIds")) ? get(item, "skillIds", "SkillIds") : [],
      });
    } catch (err) {
      warn(`Incremental preload skipped volunteer ${email}: ${err.message}`);
    }
  }

  info(`Incremental preload completed: reused coordinators=${memory.coordinators.length}, volunteers=${memory.volunteers.length}.`);
}

async function createCoordinators() {
  const needed = Math.max(0, cfg.coordinators - memory.coordinators.length);
  info(`Creating coordinators: target=${cfg.coordinators}, existing=${memory.coordinators.length}, creating=${needed}`);
  for (let i = 0; i < needed; i += 1) {
    const seedIndex = memory.coordinators.length;
    const identity = buildIdentity("Coordinator", seedIndex);
    const email = identity.email;
    const auth = await registerOrLogin(email, "Coordinator", cfg.userPassword, identity.firstName, identity.lastName);
    memory.coordinators.push({
      ...auth,
      email,
      firstName: identity.firstName,
      lastName: identity.lastName,
      password: cfg.userPassword,
      organizationId: null,
      index: memory.coordinators.length,
    });
    counters.coordinators += 1;
  }
}

async function createVolunteers() {
  const needed = Math.max(0, cfg.volunteers - memory.volunteers.length);
  info(`Creating volunteers: target=${cfg.volunteers}, existing=${memory.volunteers.length}, creating=${needed}`);

  for (let i = 0; i < needed; i += 1) {
    const seedIndex = memory.volunteers.length;
    const identity = buildIdentity("Volunteer", seedIndex);
    const email = identity.email;
    const auth = await registerOrLogin(email, "Volunteer", cfg.userPassword, identity.firstName, identity.lastName);
    const firstName = identity.firstName;
    const lastName = identity.lastName;
    try {
      await api("PUT", `/api/volunteers/${auth.linkedGrainId}/profile`, {
        token: auth.token,
        body: {
          firstName,
          lastName,
          email,
          phone: buildPhoneNumber(),
          bio: choose(volunteerBioTemplates),
        },
        expected: [204],
      });
    } catch (err) {
      warn(`Failed updating volunteer profile ${email}: ${err.message}`);
    }

    memory.volunteers.push({
      ...auth,
      email,
      password: cfg.userPassword,
      firstName,
      lastName,
      skillIds: [],
    });
    counters.volunteers += 1;
  }
}

async function signWaivers() {
  if (!cfg.seedWaivers) return;
  info("Signing waivers for volunteers...");
  for (const volunteer of memory.volunteers) {
    try {
      await api("POST", `/api/volunteers/${volunteer.linkedGrainId}/waiver`, {
        token: volunteer.token,
        expected: [200],
      });
      counters.waiversSigned += 1;
    } catch (err) {
      warn(`Failed signing waiver for ${volunteer.email}: ${err.message}`);
    }
  }
}

async function setBackgroundChecks(admin) {
  if (!cfg.seedBackgroundChecks) return;
  info("Setting background check statuses...");
  const statuses = ["Cleared", "Cleared", "Cleared", "Pending"];
  for (const volunteer of memory.volunteers) {
    try {
      const status = choose(statuses);
      await api("POST", `/api/volunteers/${volunteer.linkedGrainId}/background-check`, {
        token: admin.token,
        body: { status },
        expected: [204],
      });
      counters.backgroundChecksSet += 1;
    } catch (err) {
      warn(`Failed setting background check for ${volunteer.email}: ${err.message}`);
    }
  }
}

async function followOrganizations() {
  if (!cfg.seedFollows || memory.organizations.length === 0) return;
  info("Volunteers following organizations...");
  for (const volunteer of memory.volunteers) {
    const orgCount = 1 + Math.floor(Math.random() * Math.min(2, memory.organizations.length));
    const orgs = sampleWithoutReplacement(memory.organizations, orgCount);
    for (const org of orgs) {
      try {
        await api("POST", `/api/volunteers/${volunteer.linkedGrainId}/follow/${org.orgId}`, {
          token: volunteer.token,
          expected: [204],
        });
        counters.volunteerFollows += 1;
      } catch (err) {
        warn(`Failed follow org ${org.orgId} for ${volunteer.email}: ${err.message}`);
      }
    }
  }
}

const announcementTemplates = [
  "We're excited to announce new volunteer opportunities this month!",
  "Thank you to all volunteers who participated in last week's event.",
  "Reminder: Upcoming training session for all registered volunteers.",
  "Congratulations to our top volunteers this quarter!",
  "New partnership announcement — more opportunities coming soon.",
  "Holiday schedule update: please check the calendar for changes.",
];

async function postAnnouncements() {
  if (!cfg.seedAnnouncements) return;
  info("Posting organization announcements...");
  for (const org of memory.organizations) {
    const coordinator = memory.coordinators.find((c) => c.organizationId === org.orgId);
    if (!coordinator) continue;
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      try {
        await api("POST", `/api/organizations/${org.orgId}/announcements`, {
          token: coordinator.token,
          body: { text: choose(announcementTemplates) },
          expected: [204],
        });
        counters.announcementsPosted += 1;
      } catch (err) {
        warn(`Failed posting announcement for org ${org.orgId}: ${err.message}`);
      }
    }
  }
}

async function assignVolunteerSkills() {
  if (!cfg.seedSkills || memory.skillCatalog.length === 0) return;
  info("Assigning skills to volunteers...");
  for (const volunteer of memory.volunteers) {
    const desired = 1 + Math.floor(Math.random() * 3);
    const picked = sampleWithoutReplacement(memory.skillCatalog, desired);
    for (const skill of picked) {
      try {
        await api("POST", `/api/volunteers/${volunteer.userId}/skills/${skill.id}`, {
          token: volunteer.token,
          expected: [204],
        });
        volunteer.skillIds.push(skill.id);
        counters.skillsAssigned += 1;
      } catch (err) {
        warn(`Failed assigning skill ${skill.name} to ${volunteer.email}: ${err.message}`);
      }
    }
  }
}

async function createOrganizations(admin) {
  info("Creating organizations from coordinator accounts...");
  for (let i = 0; i < memory.coordinators.length; i += 1) {
    const c = memory.coordinators[i];
    if (c.organizationId) {
      try {
        await api("GET", `/api/organizations/${c.organizationId}`, {
          token: admin.token,
          expected: [200],
        });
        if (!memory.organizations.some((x) => x.orgId === c.organizationId)) {
          memory.organizations.push({
            orgId: c.organizationId,
            name: `Existing Org (${c.organizationId})`,
            coordinatorEmail: c.email,
            coordinatorUserId: c.userId,
            coordinatorGrainId: c.linkedGrainId,
          });
        }
        continue;
      } catch {
        warn(`Coordinator ${c.email} has stale organizationId=${c.organizationId}, creating a new organization.`);
        c.organizationId = null;
      }
    }

    const orgName = buildOrganizationName(i, c);
    let orgId;
    let usedExisting = false;
    try {
      const create = await api("POST", "/api/organizations", {
        token: c.token,
        body: {
          name: orgName,
          description: `${orgName} provides regular volunteer-led services for residents across programs and seasonal events.`,
          creatorUserId: c.userId,
          creatorEmail: c.email,
          proofUrl: "https://www.vsms.foo/proof/org-registration",
        },
        expected: [201],
      });
      orgId = get(create.data, "orgId", "OrgId");
    } catch (err) {
      const payloadText = JSON.stringify(err?.payload ?? {});
      const isAlreadyBound = err instanceof ApiError && err.status === 409 && payloadText.includes("already belongs to an organization");
      if (!isAlreadyBound) throw err;

      // Reuse existing org when coordinator is already linked (id convention: orgId == coordinator grainId).
      orgId = c.linkedGrainId;
      usedExisting = true;
      try {
        await api("GET", `/api/organizations/${orgId}`, {
          token: admin.token,
          expected: [200],
        });
      } catch {
        throw err;
      }
      warn(`Coordinator ${c.email} already has org ${orgId}, reusing it.`);
    }

    c.organizationId = orgId;
    memory.organizations.push({
      orgId,
      name: orgName,
      coordinatorEmail: c.email,
      coordinatorUserId: c.userId,
      coordinatorGrainId: c.linkedGrainId,
    });
    counters.organizations += 1;

    try {
      const approveRes = await api("POST", `/api/admin/organizations/${orgId}/approve`, {
        token: admin.token,
        expected: [204, 400],
      });
      if (approveRes.status === 204) {
        counters.approvedOrganizations += 1;
      } else {
        const detail = get(approveRes.data, "detail", "Detail", "error", "Error", "message", "Message")
          || (typeof approveRes.data === "string" ? approveRes.data : "Approve returned non-204");
        warn(`Approve org ${orgId} returned ${approveRes.status}: ${detail}`);
      }
    } catch (err) {
      if (!usedExisting) {
        warn(`Failed approving org ${orgId}: ${err.message}`);
      }
    }
  }
}

function pickOpportunityPhase() {
  if (!cfg.longRunning) return "ongoing";
  const roll = Math.random();
  if (roll < cfg.pastOpportunityRate) return "past";
  if (roll < cfg.pastOpportunityRate + cfg.ongoingOpportunityRate) return "ongoing";
  return "future";
}

function buildShiftWindow(opportunityIndex, shiftIndex, phase) {
  const now = Date.now();
  const hoursOffsetBase = (opportunityIndex % 10) * 4;
  let baseStartMs;

  if (!cfg.longRunning) {
    baseStartMs =
      shiftIndex === 0
        ? now - (5 + (opportunityIndex % 12)) * 60 * 1000
        : now + (hoursOffsetBase + shiftIndex * 3 + 1) * 60 * 60 * 1000;
    const endMs = baseStartMs + (90 + shiftIndex * 30) * 60 * 1000;
    return { startTime: toIso(baseStartMs), endTime: toIso(endMs) };
  }

  if (phase === "ongoing") {
    baseStartMs = now - randInt(5, 30) * 60 * 1000;
  } else if (phase === "past") {
    const dayOffset = randInt(2, cfg.historyDays);
    const hour = randInt(8, 18);
    const date = new Date(now - dayOffset * 24 * 60 * 60 * 1000);
    date.setUTCHours(hour, randInt(0, 1) * 30, 0, 0);
    baseStartMs = date.getTime();
  } else {
    const makeReadySoon = shiftIndex === 0 && Math.random() < cfg.checkinReadyRate;
    if (makeReadySoon) {
      // Keep some future opportunities close to "now" so web check-in flows are testable.
      baseStartMs = now + randInt(5, 25) * 60 * 1000;
    } else {
      const dayOffset = randInt(1, cfg.futureDays);
      const hour = randInt(8, 18);
      const date = new Date(now + dayOffset * 24 * 60 * 60 * 1000);
      date.setUTCHours(hour, randInt(0, 1) * 30, 0, 0);
      baseStartMs = date.getTime();
    }
  }

  const startMs =
    shiftIndex === 0
      ? baseStartMs
      : baseStartMs + (hoursOffsetBase + shiftIndex * randInt(2, 5)) * 60 * 60 * 1000;
  const endMs = startMs + (90 + shiftIndex * 30) * 60 * 1000;
  return { startTime: toIso(startMs), endTime: toIso(endMs) };
}

async function createOpportunities() {
  info("Creating opportunities and shifts...");
  const categories = ["Community", "Environment", "Education", "Health", "Technology"];
  let oppGlobalIndex = 0;

  for (const org of memory.organizations) {
    const coordinator = memory.coordinators.find((c) => c.organizationId === org.orgId);
    if (!coordinator) continue;

    for (let i = 0; i < cfg.opportunitiesPerOrg; i += 1) {
      oppGlobalIndex += 1;
      const phase = pickOpportunityPhase();
      const category = choose(categories);
      const draft = buildOpportunityDraft(category, org.name);
      const create = await api("POST", `/api/organizations/${org.orgId}/opportunities`, {
        token: coordinator.token,
        body: {
          title: draft.title,
          description: draft.description,
          category,
        },
        expected: [201],
      });
      const opportunityId = get(create.data, "opportunityId", "OpportunityId");
      counters.opportunities += 1;

      // Set geofence with the opportunity's location (500m radius)
      try {
        await withRetry(() => api("POST", `/api/opportunities/${opportunityId}/geofence`, {
          token: coordinator.token,
          body: {
            lat: draft.location.lat,
            lon: draft.location.lon,
            radiusMeters: 500,
          },
          expected: [204],
        }));
      } catch (err) {
        warn(`Failed setting geofence on opp ${opportunityId}: ${err.message}`);
      }

      for (let s = 0; s < cfg.shiftsPerOpportunity; s += 1) {
        const window = buildShiftWindow(oppGlobalIndex, s, phase);
        await withRetry(() => api("POST", `/api/opportunities/${opportunityId}/shifts`, {
          token: coordinator.token,
          body: {
            name: shiftNameTemplates[(oppGlobalIndex + s) % shiftNameTemplates.length],
            startTime: window.startTime,
            endTime: window.endTime,
            maxCapacity: 6 + ((s + i) % 8),
          },
          expected: [204],
        }));
        counters.shifts += 1;
      }

      await withRetry(() => api("POST", `/api/opportunities/${opportunityId}/publish`, {
        token: coordinator.token,
        expected: [204],
      }));

      const stateRes = await api("GET", `/api/opportunities/${opportunityId}`, {
        token: coordinator.token,
        expected: [200],
      });
      const shiftsRaw = get(stateRes.data, "shifts", "Shifts") ?? [];
      const shifts = shiftsRaw
        .map((x) => ({
          shiftId: get(x, "shiftId", "ShiftId"),
          name: get(x, "name", "Name"),
          startTime: get(x, "startTime", "StartTime"),
          endTime: get(x, "endTime", "EndTime"),
        }))
        .filter((x) => x.shiftId);

      const opportunity = {
        opportunityId,
        organizationId: org.orgId,
        title: draft.title,
        description: draft.description,
        category,
        coordinatorUserId: coordinator.userId,
        coordinatorEmail: coordinator.email,
        coordinatorToken: coordinator.token,
        coordinatorGrainId: coordinator.linkedGrainId,
        location: draft.location,
        phase,
        shifts,
      };
      memory.opportunities.push(opportunity);

      if (cfg.seedSkills && memory.skillCatalog.length > 0) {
        const required = sampleWithoutReplacement(memory.skillCatalog, Math.min(2, memory.skillCatalog.length)).map((s) => s.id);
        try {
          await withRetry(() => api("PUT", `/api/opportunities/${opportunityId}/skills`, {
            token: coordinator.token,
            body: { skillIds: required },
            expected: [204],
          }));
          counters.requiredSkillsSet += 1;
        } catch (err) {
          warn(`Failed setting required skills on opp ${opportunityId}: ${err.message}`);
        }
      }
    }
  }
}

async function createApplications() {
  info("Creating applications...");
  for (const opp of memory.opportunities) {
    if (!opp.shifts.length) {
      warn(`Opportunity ${opp.opportunityId} has no shifts, skip applications.`);
      continue;
    }
    const applicants = sampleWithoutReplacement(
      memory.volunteers,
      Math.min(cfg.applicationsPerOpportunity, memory.volunteers.length),
    );
    for (const volunteer of applicants) {
      const readyShifts = opp.shifts.filter((s) => isCheckinReadyByShiftStart(s.startTime));
      const preferredReady = opp.phase === "ongoing" && opp.shifts[0] && isCheckinReadyByShiftStart(opp.shifts[0].startTime)
        ? opp.shifts[0]
        : null;
      const shouldPreferReady = Math.random() < cfg.checkinReadyRate;
      let shift;
      if (shouldPreferReady && preferredReady) {
        shift = preferredReady;
      } else if (shouldPreferReady && readyShifts.length > 0) {
        shift = choose(readyShifts);
      } else {
        shift = choose(opp.shifts);
      }
      const key = `seed-${runId}-${opp.opportunityId}-${volunteer.linkedGrainId}-${shift.shiftId}`;
      try {
        const res = await api("POST", `/api/opportunities/${opp.opportunityId}/apply`, {
          token: volunteer.token,
          body: {
            volunteerId: volunteer.linkedGrainId,
            shiftId: shift.shiftId,
            idempotencyKey: key,
          },
          expected: [201],
        });
        const applicationId = get(res.data, "applicationId", "ApplicationId");
        memory.applications.push({
          applicationId,
          opportunityId: opp.opportunityId,
          shiftId: shift.shiftId,
          shiftName: shift.name,
          shiftStartTime: shift.startTime,
          volunteerEmail: volunteer.email,
          volunteerUserId: volunteer.userId,
          volunteerGrainId: volunteer.linkedGrainId,
          volunteerToken: volunteer.token,
          opportunityPhase: opp.phase,
          coordinatorToken: opp.coordinatorToken,
          coordinatorGrainId: opp.coordinatorGrainId,
          location: opp.location,
          status: "Pending",
        });
        counters.applications += 1;
      } catch (err) {
        warn(`Apply failed (opp=${opp.opportunityId}, volunteer=${volunteer.email}): ${err.message}`);
      }
    }
  }
}

async function processApplications() {
  info("Processing applications (approve/reject/pending mix)...");
  for (const app of memory.applications) {
    const roll = Math.random();
    if (roll < cfg.approveRate) {
      try {
        await api("POST", `/api/applications/${app.applicationId}/approve`, {
          token: app.coordinatorToken,
          expected: [204],
        });
        app.status = "Approved";
        counters.approvedApplications += 1;
        memory.approvedApps.push(app);
      } catch (err) {
        warn(`Approve failed for app ${app.applicationId}: ${err.message}`);
      }
      continue;
    }

    if (roll < cfg.approveRate + cfg.rejectRate) {
      try {
        await api("POST", `/api/applications/${app.applicationId}/reject`, {
          token: app.coordinatorToken,
          body: { reason: "Seeded rejection for workflow testing." },
          expected: [204],
        });
        app.status = "Rejected";
        counters.rejectedApplications += 1;
      } catch (err) {
        warn(`Reject failed for app ${app.applicationId}: ${err.message}`);
      }
    }
  }
}

async function runAttendanceFlows(admin) {
  if (cfg.attendanceFlows <= 0 || memory.approvedApps.length === 0) return;
  const initialReadyApproved = memory.approvedApps.filter((a) => isCheckinReadyByShiftStart(a.shiftStartTime)).length;
  const target = Math.min(cfg.attendanceFlows, memory.approvedApps.length);
  info(`Running attendance/dispute flows with success target=${target} from approved applications=${memory.approvedApps.length} (ready now=${initialReadyApproved})...`);

  if (initialReadyApproved < target) {
    const pendingReady = memory.applications.filter((a) =>
      a.status === "Pending" && isCheckinReadyByShiftStart(a.shiftStartTime));
    for (const app of pendingReady) {
      if (memory.approvedApps.length >= cfg.attendanceFlows) break;
      try {
        await api("POST", `/api/applications/${app.applicationId}/approve`, {
          token: app.coordinatorToken,
          expected: [204],
        });
        app.status = "Approved";
        memory.approvedApps.push(app);
        counters.approvedApplications += 1;
      } catch (err) {
        warn(`Auto-approve for attendance flow failed (app=${app.applicationId}): ${err.message}`);
      }
    }
  }

  const prioritized = [...memory.approvedApps].sort((a, b) => {
    const ar = isCheckinReadyByShiftStart(a.shiftStartTime) ? 0 : 1;
    const br = isCheckinReadyByShiftStart(b.shiftStartTime) ? 0 : 1;
    if (ar !== br) return ar - br;
    const aw = a.opportunityPhase === "ongoing" ? 0 : 1;
    const bw = b.opportunityPhase === "ongoing" ? 0 : 1;
    if (aw !== bw) return aw - bw;
    const at = parseIsoMs(a.shiftStartTime) ?? Number.MAX_SAFE_INTEGER;
    const bt = parseIsoMs(b.shiftStartTime) ?? Number.MAX_SAFE_INTEGER;
    return at - bt;
  });
  const finalTarget = Math.min(cfg.attendanceFlows, prioritized.length);
  let successes = 0;
  for (let i = 0; i < prioritized.length; i += 1) {
    if (successes >= finalTarget) break;
    const app = prioritized[i];
    try {
      const appState = await api("GET", `/api/applications/${app.applicationId}`, {
        token: app.coordinatorToken,
        expected: [200],
      });
      const attendanceId = get(appState.data, "attendanceRecordId", "AttendanceRecordId");
      if (!attendanceId || attendanceId === "00000000-0000-0000-0000-000000000000") {
        warn(`App ${app.applicationId} has no attendance id yet.`);
        continue;
      }

      // Decide: volunteer self-checkin vs coordinator-checkin
      const useCoordinatorCheckin = Math.random() < cfg.coordinatorCheckinRate;

      if (useCoordinatorCheckin) {
        // Coordinator-assisted check-in (no geo/photo needed)
        const coordCheckIn = await api("POST", `/api/attendance/${attendanceId}/coordinator-checkin`, {
          token: app.coordinatorToken,
          expected: [204, 400],
        });
        if (coordCheckIn.status !== 204) {
          const detail = get(coordCheckIn.data, "detail", "Detail", "error", "Error", "message", "Message")
            || (typeof coordCheckIn.data === "string" ? coordCheckIn.data : "Coordinator check-in rejected");
          warn(`Attendance ${attendanceId} coordinator check-in skipped (${detail}).`);
          continue;
        }
        counters.coordinatorCheckins += 1;
      } else {
        // Volunteer self-checkin with location data
        // Use the opportunity's geofence location + small jitter (±100m) to stay within 500m radius
        const checkinLat = app.location.lat + (Math.random() - 0.5) * 0.002;
        const checkinLon = app.location.lon + (Math.random() - 0.5) * 0.002;
        const checkIn = await api("POST", `/api/attendance/${attendanceId}/checkin`, {
          token: app.volunteerToken,
          body: {
            lat: checkinLat,
            lon: checkinLon,
            proofPhotoUrl: `https://www.vsms.foo/photos/checkin-${attendanceId}.jpg`,
          },
          expected: [204, 400],
        });
        if (checkIn.status !== 204) {
          const detail = get(checkIn.data, "detail", "Detail", "error", "Error", "message", "Message")
            || (typeof checkIn.data === "string" ? checkIn.data : "Check-in rejected");
          warn(`Attendance ${attendanceId} check-in skipped (${detail}).`);
          continue;
        }
      }

      await api("POST", `/api/attendance/${attendanceId}/checkout`, {
        token: app.volunteerToken,
        expected: [204],
      });

      // Backdate check-in/out to produce realistic hours (1.5 – 6h)
      const durationHours = 1.5 + Math.random() * 4.5;
      const fakeCheckOut = new Date();
      const fakeCheckIn = new Date(fakeCheckOut.getTime() - durationHours * 60 * 60 * 1000);
      try {
        await api("POST", `/api/attendance/${attendanceId}/adjust`, {
          token: app.coordinatorToken,
          body: {
            coordinatorId: app.coordinatorGrainId,
            newCheckIn: fakeCheckIn.toISOString(),
            newCheckOut: fakeCheckOut.toISOString(),
            reason: "Seed: adjust to realistic duration",
          },
          expected: [204],
        });
      } catch {
        // Non-critical: hours stay at 0 if adjust fails
      }

      counters.attendanceCheckedInOut += 1;
      successes += 1;

      // Dispute must happen BEFORE confirm (requires CheckedOut status)
      if (Math.random() < cfg.disputeRate) {
        await api("POST", `/api/attendance/${attendanceId}/dispute`, {
          token: app.volunteerToken,
          body: {
            reason: "Seeded dispute: verify checkout duration.",
            evidenceUrl: "https://example.com/evidence/seed",
          },
          expected: [204],
        });
        counters.disputesRaised += 1;

        await api("POST", `/api/admin/disputes/${attendanceId}/resolve`, {
          token: admin.token,
          body: {
            resolution: "Seeded resolution: adjusted after review.",
            adjustedHours: 2.0,
          },
          expected: [204],
        });
        counters.disputesResolved += 1;
      } else {
        // Confirm attendance so VolunteerGrain.TotalHours gets updated
        // (only Confirm triggers AddCompletedHours + IncrementCompletedOpportunities)
        try {
          await api("POST", `/api/attendance/${attendanceId}/confirm`, {
            token: app.coordinatorToken,
            body: {
              supervisorId: app.coordinatorGrainId,
              rating: 3 + Math.floor(Math.random() * 3), // 3-5 stars
            },
            expected: [204],
          });
        } catch {
          // Non-critical if confirm fails
        }
      }
    } catch (err) {
      warn(`Attendance flow failed for app ${app.applicationId}: ${err.message}`);
    }
  }

  if (successes < finalTarget) {
    warn(`Attendance flow completed with ${successes}/${finalTarget} successes. Increase --ongoing-opportunity-rate or lower --attendance-flows for this data window.`);
  }
}

async function writeOutput() {
  const outDir = path.resolve("data", "debug-seed");
  await fs.mkdir(outDir, { recursive: true });

  const payload = {
    runId,
    generatedAt: new Date().toISOString(),
    apiBaseUrl: cfg.baseUrl,
    settings: {
      coordinators: cfg.coordinators,
      volunteers: cfg.volunteers,
      opportunitiesPerOrg: cfg.opportunitiesPerOrg,
      shiftsPerOpportunity: cfg.shiftsPerOpportunity,
      applicationsPerOpportunity: cfg.applicationsPerOpportunity,
      approveRate: cfg.approveRate,
      rejectRate: cfg.rejectRate,
      attendanceFlows: cfg.attendanceFlows,
      disputeRate: cfg.disputeRate,
      checkinReadyRate: cfg.checkinReadyRate,
      longRunning: cfg.longRunning,
      historyDays: cfg.historyDays,
      futureDays: cfg.futureDays,
      pastOpportunityRate: cfg.pastOpportunityRate,
      ongoingOpportunityRate: cfg.ongoingOpportunityRate,
      seedSkills: cfg.seedSkills,
      seedCertificates: cfg.seedCertificates,
      seedWaivers: cfg.seedWaivers,
      seedBackgroundChecks: cfg.seedBackgroundChecks,
      seedFollows: cfg.seedFollows,
      seedAnnouncements: cfg.seedAnnouncements,
      coordinatorCheckinRate: cfg.coordinatorCheckinRate,
      incremental: cfg.incremental,
    },
    defaultUserPassword: cfg.userPassword,
    counters,
    coordinators: memory.coordinators.map((x) => ({
      email: x.email,
      password: x.password,
      userId: x.userId,
      grainId: x.linkedGrainId,
      fullName: [x.firstName, x.lastName].filter(Boolean).join(" "),
      organizationId: x.organizationId,
    })),
    volunteers: memory.volunteers.map((x) => ({
      email: x.email,
      password: x.password,
      userId: x.userId,
      grainId: x.linkedGrainId,
      fullName: `${x.firstName} ${x.lastName}`,
      skillIds: x.skillIds,
    })),
    organizations: memory.organizations,
    opportunities: memory.opportunities.map((x) => ({
      opportunityId: x.opportunityId,
      organizationId: x.organizationId,
      title: x.title,
      description: x.description,
      category: x.category,
      phase: x.phase,
      shifts: x.shifts,
    })),
  };

  const fullPath = path.join(outDir, `seed-${runId}.json`);
  const latestPath = path.join(outDir, "latest.json");
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  await fs.writeFile(fullPath, text, "utf8");
  await fs.writeFile(latestPath, text, "utf8");
  return { fullPath, latestPath };
}

async function main() {
  info(`Run ID: ${runId}`);
  info(`Target API: ${cfg.baseUrl}`);
  const admin = await loginAdmin();
  await preloadIncrementalUsers();
  await maybeSeedCertificates(admin);
  await seedSkills(admin);
  await createCoordinators();
  await createVolunteers();
  await assignVolunteerSkills();
  await signWaivers();
  await setBackgroundChecks(admin);
  await createOrganizations(admin);
  await followOrganizations();
  await createOpportunities();
  await postAnnouncements();
  await createApplications();
  await processApplications();
  await runAttendanceFlows(admin);

  const out = await writeOutput();
  info("Seed completed.");
  console.log("\n=== Summary ===");
  Object.entries(counters).forEach(([k, v]) => console.log(`${k}: ${v}`));
  console.log(`\nCredentials/Data output: ${out.fullPath}`);
  console.log(`Latest snapshot: ${out.latestPath}`);
}

main().catch((err) => {
  console.error("[seed][fatal]", err?.message ?? err);
  if (err?.payload !== undefined) {
    console.error("[seed][fatal][payload]", JSON.stringify(err.payload));
  }
  process.exitCode = 1;
});
