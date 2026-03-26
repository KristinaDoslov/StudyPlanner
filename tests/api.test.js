const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const request = require("supertest");

const testDbPath = path.join(__dirname, "test-database.db");
process.env.DATABASE_PATH = testDbPath;
process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = "test-session-secret";

const { createApp } = require("../app");
const { initializeDatabase, run, closeDatabase } = require("../services/db");

const app = createApp();

async function clearDatabase() {
  await run("DELETE FROM tasks");
  await run("DELETE FROM users");
}

test.before(async () => {
  await initializeDatabase();
});

test.after(async () => {
  await closeDatabase();
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});

test.beforeEach(async () => {
  await clearDatabase();
});

test("register, login, me, and logout flow", async () => {
  const agent = request.agent(app);

  const registerResponse = await agent.post("/api/auth/register").send({
    name: "Kristina",
    email: "kristina@example.com",
    password: "secret123",
  });

  assert.equal(registerResponse.status, 201);
  assert.equal(registerResponse.body.email, "kristina@example.com");

  const meResponse = await agent.get("/api/auth/me");
  assert.equal(meResponse.status, 200);
  assert.equal(meResponse.body.name, "Kristina");

  const logoutResponse = await agent.post("/api/auth/logout");
  assert.equal(logoutResponse.status, 204);

  const meAfterLogout = await agent.get("/api/auth/me");
  assert.equal(meAfterLogout.status, 401);

  const loginResponse = await agent.post("/api/auth/login").send({
    email: "kristina@example.com",
    password: "secret123",
  });

  assert.equal(loginResponse.status, 200);
  assert.equal(loginResponse.body.name, "Kristina");
});

test("task CRUD and calendar flow", async () => {
  const agent = request.agent(app);

  await agent.post("/api/auth/register").send({
    name: "User",
    email: "user@example.com",
    password: "secret123",
  });

  const createResponse = await agent.post("/api/tasks").send({
    subject: "Math",
    type: "ispit",
    title: "Midterm",
    dueDate: "2026-04-15",
  });

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.completed, false);

  const taskId = createResponse.body.id;

  const listResponse = await agent.get("/api/tasks");
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.length, 1);

  const subjectResponse = await agent.get("/api/subjects");
  assert.equal(subjectResponse.status, 200);
  assert.deepEqual(subjectResponse.body, ["Math"]);

  const patchResponse = await agent.patch(`/api/tasks/${taskId}`).send({ completed: true });
  assert.equal(patchResponse.status, 200);
  assert.equal(patchResponse.body.completed, true);

  const calendarResponse = await agent.get("/api/exams-calendar?month=2026-04");
  assert.equal(calendarResponse.status, 200);
  assert.equal(calendarResponse.body.length, 1);

  const deleteResponse = await agent.delete(`/api/tasks/${taskId}`);
  assert.equal(deleteResponse.status, 204);

  const listAfterDelete = await agent.get("/api/tasks");
  assert.equal(listAfterDelete.status, 200);
  assert.equal(listAfterDelete.body.length, 0);
});

test("validation returns clear API errors", async () => {
  const registerResponse = await request(app).post("/api/auth/register").send({
    name: "",
    email: "bad",
    password: "123",
  });

  assert.equal(registerResponse.status, 400);
  assert.equal(typeof registerResponse.body.error, "string");
});
