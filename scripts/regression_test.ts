/**
 * Regression Test Suite for Classroom Backend API
 * Tests: Auth, Departments, Subjects, Classes, Users, Announcements, Timetable, Stats, Enrollments
 * 
 * Run: npx tsx scripts/regression_test.ts
 */

const BASE = "http://localhost:8080";
let cookie = "";
let passed = 0;
let failed = 0;
const failures: string[] = [];

// ── Helpers ──

async function req(method: string, path: string, body?: any) {
  const start = Date.now();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:5173",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const elapsed = Date.now() - start;
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, elapsed, headers: res.headers };
}

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    const msg = `  ❌ ${name}${detail ? " — " + detail : ""}`;
    console.log(msg);
    failures.push(name);
  }
}

// ── 1. Health Check ──

async function testHealth() {
  console.log("\n🔍 Health Check");
  const start = Date.now();
  const res = await fetch(BASE);
  const text = await res.text();
  const elapsed = Date.now() - start;
  assert("Server responds", res.status === 200, `status=${res.status}`);
  assert("Health response time < 500ms", elapsed < 500, `${elapsed}ms`);
}

// ── 2. Authentication ──

async function testAuth() {
  console.log("\n🔐 Authentication");

  // Unauthenticated access should be blocked
  const { status: noAuth } = await req("GET", "/api/subjects");
  assert("Unauthenticated GET /api/subjects returns 403", noAuth === 403, `got ${noAuth}`);

  // Login with admin
  const loginStart = Date.now();
  const loginRes = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": "http://localhost:5173" },
    body: JSON.stringify({ email: "admin99@example.com", password: "password123" }),
  });
  const loginElapsed = Date.now() - loginStart;
  const loginJson = await loginRes.json().catch(() => ({}));

  assert("Admin login succeeds", loginRes.status === 200, `status=${loginRes.status}`);
  assert("Login response time < 5s", loginElapsed < 5000, `${loginElapsed}ms`);
  assert("Login returns user data", !!loginJson.user, JSON.stringify(Object.keys(loginJson)));

  // Extract session cookie
  const rawSetCookie = loginRes.headers.get("set-cookie") || "";
  cookie = rawSetCookie.split(",").map((c: string) => c.split(";")[0].trim()).filter(Boolean).join("; ");
  assert("Session cookie received", cookie.length > 0, `cookie length=${cookie.length}`);

  // Session check
  const sessionStart = Date.now();
  const { status: sessStatus, json: sessJson, elapsed: sessElapsed } = await req("GET", "/api/auth/get-session");
  assert("Get session succeeds", sessStatus === 200, `status=${sessStatus}`);
  assert("Session response time < 3s", sessElapsed < 3000, `${sessElapsed}ms`);
  assert("Session returns user", !!sessJson?.user, JSON.stringify(Object.keys(sessJson || {})));
}

// ── 3. Departments CRUD ──

async function testDepartments() {
  console.log("\n🏢 Departments");

  const { status: listStatus, json: listJson, elapsed: listElapsed } = await req("GET", "/api/departments");
  assert("GET /departments succeeds", listStatus === 200, `status=${listStatus}`);
  assert("Departments response time < 3s", listElapsed < 3000, `${listElapsed}ms`);
  assert("Departments returns data array", Array.isArray(listJson.data), typeof listJson.data);

  // Create
  const { status: createStatus, json: createJson } = await req("POST", "/api/departments", {
    name: "Test Dept " + Date.now(),
    code: "TD" + Date.now().toString().slice(-4),
    description: "Automated test department",
  });
  assert("POST /departments creates", createStatus === 201, `status=${createStatus}`);
  const deptId = createJson.data?.id;
  assert("Created department has ID", !!deptId, JSON.stringify(createJson.data));

  if (deptId) {
    // Get one
    const { status: getStatus, json: getJson } = await req("GET", `/api/departments/${deptId}`);
    assert("GET /departments/:id succeeds", getStatus === 200, `status=${getStatus}`);

    // Update
    const { status: patchStatus } = await req("PATCH", `/api/departments/${deptId}`, {
      name: "Updated Test Dept",
      code: getJson.data?.code || "UPD",
      description: "Updated description",
    });
    assert("PATCH /departments/:id succeeds", patchStatus === 200, `status=${patchStatus}`);

    // Delete
    const { status: delStatus } = await req("DELETE", `/api/departments/${deptId}`);
    assert("DELETE /departments/:id succeeds", delStatus === 200, `status=${delStatus}`);
  }
}

// ── 4. Subjects CRUD ──

async function testSubjects() {
  console.log("\n📚 Subjects");

  const { status: listStatus, json: listJson, elapsed } = await req("GET", "/api/subjects");
  assert("GET /subjects succeeds", listStatus === 200, `status=${listStatus}`);
  assert("Subjects response time < 3s", elapsed < 3000, `${elapsed}ms`);
  assert("Subjects returns data array", Array.isArray(listJson.data), typeof listJson.data);

  // Need a department for subject creation
  const { json: deptJson } = await req("POST", "/api/departments", {
    name: "SubjTestDept" + Date.now(),
    code: "ST" + Date.now().toString().slice(-4),
    description: "For subject test",
  });
  const deptId = deptJson.data?.id;
  if (!deptId) { console.log("  ⚠️ Skipping subject create (no dept)"); return; }

  const { status: createStatus, json: createJson } = await req("POST", "/api/subjects", {
    name: "Test Subject " + Date.now(),
    code: "TS" + Date.now().toString().slice(-5),
    description: "Automated test subject",
    departmentId: deptId,
  });
  assert("POST /subjects creates", createStatus === 201, `status=${createStatus}`);
  const subjId = createJson.data?.id;

  if (subjId) {
    const { status: getStatus } = await req("GET", `/api/subjects/${subjId}`);
    assert("GET /subjects/:id succeeds", getStatus === 200, `status=${getStatus}`);

    const { status: patchStatus } = await req("PATCH", `/api/subjects/${subjId}`, { name: "Updated Subject" });
    assert("PATCH /subjects/:id succeeds", patchStatus === 200, `status=${patchStatus}`);

    const { status: delStatus } = await req("DELETE", `/api/subjects/${subjId}`);
    assert("DELETE /subjects/:id succeeds", delStatus === 200, `status=${delStatus}`);
  }

  // Cleanup dept
  await req("DELETE", `/api/departments/${deptId}`);
}

// ── 5. Users ──

async function testUsers() {
  console.log("\n👤 Users");

  const { status: listStatus, json: listJson, elapsed } = await req("GET", "/api/users");
  assert("GET /users succeeds", listStatus === 200, `status=${listStatus}`);
  assert("Users response time < 3s", elapsed < 3000, `${elapsed}ms`);
  assert("Users returns data array", Array.isArray(listJson.data), typeof listJson.data);

  if (listJson.data?.length > 0) {
    const userId = listJson.data[0].id;
    const { status: getStatus } = await req("GET", `/api/users/${userId}`);
    assert("GET /users/:id succeeds", getStatus === 200, `status=${getStatus}`);

    // Update name
    const { status: patchStatus } = await req("PATCH", `/api/users/${userId}`, {
      name: listJson.data[0].name,
    });
    assert("PATCH /users/:id succeeds", patchStatus === 200, `status=${patchStatus}`);
  }

  // Role filter
  const { status: filterStatus, json: filterJson } = await req("GET", "/api/users?role=admin");
  assert("GET /users?role=admin succeeds", filterStatus === 200, `status=${filterStatus}`);
  assert("Filtered users are admins", (filterJson.data || []).every((u: any) => u.role === "admin"), "role mismatch");
}

// ── 6. Classes ──

async function testClasses() {
  console.log("\n📖 Classes");

  const { status: listStatus, json: listJson, elapsed } = await req("GET", "/api/classes");
  assert("GET /classes succeeds", listStatus === 200, `status=${listStatus}`);
  assert("Classes response time < 3s", elapsed < 3000, `${elapsed}ms`);
  assert("Classes returns data array", Array.isArray(listJson.data), typeof listJson.data);

  if (listJson.data?.length > 0) {
    const classId = listJson.data[0].id;
    const { status: getStatus, json: getJson, elapsed: getElapsed } = await req("GET", `/api/classes/${classId}`);
    assert("GET /classes/:id succeeds", getStatus === 200, `status=${getStatus}`);
    assert("Class detail response time < 3s", getElapsed < 3000, `${getElapsed}ms`);
    assert("Class has schedules field", Array.isArray(getJson.data?.schedules), typeof getJson.data?.schedules);
  }
}

// ── 7. Announcements ──

async function testAnnouncements() {
  console.log("\n📢 Announcements");

  const { status: listStatus, json: listJson, elapsed } = await req("GET", "/api/announcements");
  assert("GET /announcements succeeds", listStatus === 200, `status=${listStatus}`);
  assert("Announcements response time < 3s", elapsed < 3000, `${elapsed}ms`);
  assert("Announcements returns data array", Array.isArray(listJson.data), typeof listJson.data);
}

// ── 8. Timetable ──

async function testTimetable() {
  console.log("\n📅 Timetable");

  const { status, json, elapsed } = await req("GET", "/api/timetable");
  assert("GET /timetable succeeds", status === 200, `status=${status}`);
  assert("Timetable response time < 3s", elapsed < 3000, `${elapsed}ms`);
  assert("Timetable returns data array", Array.isArray(json.data), typeof json.data);
}

// ── 9. Stats ──

async function testStats() {
  console.log("\n📊 Stats");

  const { status, json, elapsed } = await req("GET", "/api/stats");
  assert("GET /stats succeeds", status === 200, `status=${status}`);
  assert("Stats response time < 3s", elapsed < 3000, `${elapsed}ms`);
  assert("Stats returns data", !!json.data, JSON.stringify(Object.keys(json)));
  assert("Stats has totalSubjects", typeof json.data?.totalSubjects === "number", `${json.data?.totalSubjects}`);
}

// ── 10. Performance: measure all key endpoints ──

async function testPerformance() {
  console.log("\n⏱️  Performance Summary (response times)");

  const endpoints = [
    ["GET", "/api/auth/get-session"],
    ["GET", "/api/subjects"],
    ["GET", "/api/classes"],
    ["GET", "/api/users"],
    ["GET", "/api/departments"],
    ["GET", "/api/announcements"],
    ["GET", "/api/timetable"],
    ["GET", "/api/stats"],
  ];

  for (const [method, path] of endpoints) {
    const { elapsed, status } = await req(method, path);
    const slow = elapsed > 3000;
    console.log(`  ${slow ? "🐌" : "⚡"} ${path}: ${elapsed}ms (${status})`);
    if (slow) {
      assert(`${path} responds within 3s`, false, `${elapsed}ms`);
    }
  }
}

// ── 11. Role-Based Access ──

async function testRoleAccess() {
  console.log("\n🔒 Role-Based Access (Admin)");

  // Admin should access everything
  const { status: usersStatus } = await req("GET", "/api/users");
  assert("Admin can access /users", usersStatus === 200, `status=${usersStatus}`);

  const { status: statsStatus } = await req("GET", "/api/stats");
  assert("Admin can access /stats", statsStatus === 200, `status=${statsStatus}`);

  const { status: subjectsStatus } = await req("GET", "/api/subjects");
  assert("Admin can access /subjects", subjectsStatus === 200, `status=${subjectsStatus}`);
}

// ── Main ──

async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║   Classroom API Regression Tests     ║");
  console.log("╚══════════════════════════════════════╝");

  try {
    await testHealth();
    await testAuth();
    await testDepartments();
    await testSubjects();
    await testUsers();
    await testClasses();
    await testAnnouncements();
    await testTimetable();
    await testStats();
    await testRoleAccess();
    await testPerformance();
  } catch (err) {
    console.error("\n💥 Fatal error:", err);
    failed++;
  }

  console.log("\n══════════════════════════════════════");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.log("Failed tests:");
    failures.forEach((f) => console.log(`  - ${f}`));
  }
  console.log("══════════════════════════════════════\n");

  process.exit(failed > 0 ? 1 : 0);
}

main();
