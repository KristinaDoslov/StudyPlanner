const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const requireAuth = require("./middleware/requireAuth");
const { asyncHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 3000;

const dbPath = path.join(__dirname, "database", "database.db");
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row || null);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows || []);
    });
  });
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeEmail(value) {
  return String(value).trim().toLowerCase();
}

function isValidEmail(value) {
  return EMAIL_REGEX.test(value);
}

async function initializeDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('zadatak', 'ispit')),
      title TEXT NOT NULL,
      due_date TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run("CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON tasks(user_id, due_date)");
  await run("CREATE INDEX IF NOT EXISTS idx_tasks_user_subject ON tasks(user_id, subject)");
}

app.use(express.json());
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  session({
    secret: process.env.SESSION_SECRET || "study-planner-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

app.use(express.static(path.join(__dirname, "public")));

app.post(
  "/api/auth/register",
  asyncHandler(async (request, response) => {
    const { name, email, password } = request.body;

    if (!isNonEmptyString(name) || !isNonEmptyString(email) || !isNonEmptyString(password)) {
      response.status(400).json({ error: "Missing fields" });
      return;
    }

    if (password.length < 6) {
      response.status(400).json({ error: "Password must be at least 6 characters long." });
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      response.status(400).json({ error: "Invalid email format." });
      return;
    }

    const trimmedName = String(name).trim();
    const existingUser = await get("SELECT id FROM users WHERE email = ?", [normalizedEmail]);
    if (existingUser) {
      response.status(409).json({ error: "A user with this email already exists." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await run(
      "INSERT INTO users(name, email, password_hash) VALUES (?, ?, ?)",
      [trimmedName, normalizedEmail, passwordHash]
    );

    request.session.userId = result.id;
    response.status(201).json({
      id: result.id,
      name: trimmedName,
      email: normalizedEmail,
    });
  })
);

app.post(
  "/api/auth/login",
  asyncHandler(async (request, response) => {
    const { email, password } = request.body;

    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      response.status(400).json({ error: "Missing fields" });
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      response.status(400).json({ error: "Invalid email format." });
      return;
    }

    const user = await get("SELECT id, name, email, password_hash FROM users WHERE email = ?", [normalizedEmail]);
    if (!user) {
      response.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      response.status(401).json({ error: "Invalid email or password." });
      return;
    }

    request.session.userId = user.id;
    response.json({
      id: user.id,
      name: user.name,
      email: user.email,
    });
  })
);

app.post("/api/auth/logout", (request, response) => {
  request.session.destroy((error) => {
    if (error) {
      response.status(500).json({ error: "Internal server error" });
      return;
    }

    response.clearCookie("connect.sid");
    response.status(204).send();
  });
});

app.get(
  "/api/auth/me",
  asyncHandler(async (request, response) => {
    if (!request.session.userId) {
      response.status(401).json({ error: "You are not authenticated." });
      return;
    }

    const user = await get("SELECT id, name, email FROM users WHERE id = ?", [request.session.userId]);
    if (!user) {
      response.status(401).json({ error: "Session is not valid." });
      return;
    }

    response.json(user);
  })
);

app.get(
  "/api/subjects",
  requireAuth,
  asyncHandler(async (request, response) => {
    const rows = await all(
      "SELECT DISTINCT subject FROM tasks WHERE user_id = ? ORDER BY subject COLLATE NOCASE ASC",
      [request.session.userId]
    );

    response.json(rows.map((row) => row.subject));
  })
);

app.get(
  "/api/tasks",
  requireAuth,
  asyncHandler(async (request, response) => {
    const params = [request.session.userId];
    let where = "WHERE user_id = ?";
    const subjectFilter = String(request.query.subject || "").trim();

    if (subjectFilter) {
      where += " AND subject = ?";
      params.push(subjectFilter);
    }

    const rows = await all(
      `SELECT id, subject, type, title, due_date AS dueDate, completed
       FROM tasks
       ${where}
       ORDER BY due_date ASC, id DESC`,
      params
    );

    response.json(
      rows.map((row) => ({
        ...row,
        completed: Boolean(row.completed),
      }))
    );
  })
);

app.post(
  "/api/tasks",
  requireAuth,
  asyncHandler(async (request, response) => {
    const { subject, type, title, dueDate } = request.body;

    if (!isNonEmptyString(subject) || !isNonEmptyString(type) || !isNonEmptyString(title) || !isNonEmptyString(dueDate)) {
      response.status(400).json({ error: "Missing fields" });
      return;
    }

    if (!["zadatak", "ispit"].includes(type)) {
      response.status(400).json({ error: "Invalid obligation type." });
      return;
    }

    const result = await run(
      "INSERT INTO tasks(user_id, subject, type, title, due_date, completed) VALUES (?, ?, ?, ?, ?, 0)",
      [request.session.userId, String(subject).trim(), type, String(title).trim(), String(dueDate).trim()]
    );

    const insertedTask = await get(
      "SELECT id, subject, type, title, due_date AS dueDate, completed FROM tasks WHERE id = ?",
      [result.id]
    );

    response.status(201).json({
      ...insertedTask,
      completed: Boolean(insertedTask.completed),
    });
  })
);

app.patch(
  "/api/tasks/:id",
  requireAuth,
  asyncHandler(async (request, response) => {
    const taskId = Number(request.params.id);
    const { completed } = request.body;

    if (!Number.isInteger(taskId)) {
      response.status(400).json({ error: "Invalid ID." });
      return;
    }

    if (typeof completed !== "boolean") {
      response.status(400).json({ error: "Field 'completed' must be boolean." });
      return;
    }

    await run(
      "UPDATE tasks SET completed = ? WHERE id = ? AND user_id = ?",
      [completed ? 1 : 0, taskId, request.session.userId]
    );

    const task = await get(
      "SELECT id, subject, type, title, due_date AS dueDate, completed FROM tasks WHERE id = ? AND user_id = ?",
      [taskId, request.session.userId]
    );

    if (!task) {
      response.status(404).json({ error: "Obligation not found." });
      return;
    }

    response.json({ ...task, completed: Boolean(task.completed) });
  })
);

app.delete(
  "/api/tasks/:id",
  requireAuth,
  asyncHandler(async (request, response) => {
    const taskId = Number(request.params.id);

    if (!Number.isInteger(taskId)) {
      response.status(400).json({ error: "Invalid ID." });
      return;
    }

    const result = await run("DELETE FROM tasks WHERE id = ? AND user_id = ?", [taskId, request.session.userId]);
    if (!result.changes) {
      response.status(404).json({ error: "Obligation not found." });
      return;
    }

    response.status(204).send();
  })
);

app.get(
  "/api/exams-calendar",
  requireAuth,
  asyncHandler(async (request, response) => {
    const month = String(request.query.month || "").trim();

    if (!/^\d{4}-\d{2}$/.test(month)) {
      response.status(400).json({ error: "Invalid month. Format must be YYYY-MM." });
      return;
    }

    const rows = await all(
      `SELECT id, title, subject, due_date AS dueDate
       FROM tasks
       WHERE user_id = ?
         AND type = 'ispit'
         AND substr(due_date, 1, 7) = ?
       ORDER BY due_date ASC`,
      [request.session.userId, month]
    );

    response.json(rows);
  })
);

app.use(errorHandler);

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Study Planner server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
    process.exit(1);
  });
