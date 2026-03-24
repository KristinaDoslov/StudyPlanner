const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

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
app.use(
  session({
    secret: process.env.SESSION_SECRET || "study-planner-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    },
  })
);

app.use(express.static(path.join(__dirname, "public")));

function requireAuth(request, response, next) {
  if (!request.session.userId) {
    response.status(401).json({ message: "You are not authenticated." });
    return;
  }

  next();
}

app.post("/api/auth/register", async (request, response) => {
  try {
    const { name, email, password } = request.body;

    if (!name || !email || !password) {
      response.status(400).json({ message: "All fields are required." });
      return;
    }

    if (password.length < 6) {
      response.status(400).json({ message: "Password must be at least 6 characters long." });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingUser = await get("SELECT id FROM users WHERE email = ?", [normalizedEmail]);
    if (existingUser) {
      response.status(409).json({ message: "A user with this email already exists." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await run(
      "INSERT INTO users(name, email, password_hash) VALUES (?, ?, ?)",
      [String(name).trim(), normalizedEmail, passwordHash]
    );

    request.session.userId = result.id;

    response.status(201).json({
      id: result.id,
      name: String(name).trim(),
      email: normalizedEmail,
    });
  } catch (error) {
    response.status(500).json({ message: "Server error.", detail: error.message });
  }
});

app.post("/api/auth/login", async (request, response) => {
  try {
    const { email, password } = request.body;

    if (!email || !password) {
      response.status(400).json({ message: "Email and password are required." });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await get("SELECT id, name, email, password_hash FROM users WHERE email = ?", [normalizedEmail]);

    if (!user) {
      response.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      response.status(401).json({ message: "Invalid email or password." });
      return;
    }

    request.session.userId = user.id;

    response.json({
      id: user.id,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    response.status(500).json({ message: "Server error.", detail: error.message });
  }
});

app.post("/api/auth/logout", (request, response) => {
  request.session.destroy(() => {
    response.status(204).send();
  });
});

app.get("/api/auth/me", async (request, response) => {
  try {
    if (!request.session.userId) {
      response.status(401).json({ message: "You are not authenticated." });
      return;
    }

    const user = await get("SELECT id, name, email FROM users WHERE id = ?", [request.session.userId]);

    if (!user) {
      response.status(401).json({ message: "Session is not valid." });
      return;
    }

    response.json(user);
  } catch (error) {
    response.status(500).json({ message: "Server error.", detail: error.message });
  }
});

app.get("/api/subjects", requireAuth, async (request, response) => {
  try {
    const rows = await all(
      "SELECT DISTINCT subject FROM tasks WHERE user_id = ? ORDER BY subject COLLATE NOCASE ASC",
      [request.session.userId]
    );

    response.json(rows.map((row) => row.subject));
  } catch (error) {
    response.status(500).json({ message: "Server error.", detail: error.message });
  }
});

app.get("/api/tasks", requireAuth, async (request, response) => {
  try {
    const params = [request.session.userId];
    let where = "WHERE user_id = ?";

    if (request.query.subject) {
      where += " AND subject = ?";
      params.push(request.query.subject);
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
  } catch (error) {
    response.status(500).json({ message: "Server error.", detail: error.message });
  }
});

app.post("/api/tasks", requireAuth, async (request, response) => {
  try {
    const { subject, type, title, dueDate } = request.body;

    if (!subject || !type || !title || !dueDate) {
      response.status(400).json({ message: "All fields are required." });
      return;
    }

    if (!["zadatak", "ispit"].includes(type)) {
      response.status(400).json({ message: "Invalid obligation type." });
      return;
    }

    const result = await run(
      "INSERT INTO tasks(user_id, subject, type, title, due_date, completed) VALUES (?, ?, ?, ?, ?, 0)",
      [request.session.userId, String(subject).trim(), type, String(title).trim(), dueDate]
    );

    const insertedTask = await get(
      "SELECT id, subject, type, title, due_date AS dueDate, completed FROM tasks WHERE id = ?",
      [result.id]
    );

    response.status(201).json({
      ...insertedTask,
      completed: Boolean(insertedTask.completed),
    });
  } catch (error) {
    response.status(500).json({ message: "Server error.", detail: error.message });
  }
});

app.patch("/api/tasks/:id", requireAuth, async (request, response) => {
  try {
    const taskId = Number(request.params.id);
    const { completed } = request.body;

    if (!Number.isInteger(taskId)) {
      response.status(400).json({ message: "Invalid ID." });
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
      response.status(404).json({ message: "Obligation not found." });
      return;
    }

    response.json({ ...task, completed: Boolean(task.completed) });
  } catch (error) {
    response.status(500).json({ message: "Server error.", detail: error.message });
  }
});

app.delete("/api/tasks/:id", requireAuth, async (request, response) => {
  try {
    const taskId = Number(request.params.id);

    if (!Number.isInteger(taskId)) {
      response.status(400).json({ message: "Invalid ID." });
      return;
    }

    const result = await run("DELETE FROM tasks WHERE id = ? AND user_id = ?", [taskId, request.session.userId]);

    if (!result.changes) {
      response.status(404).json({ message: "Obligation not found." });
      return;
    }

    response.status(204).send();
  } catch (error) {
    response.status(500).json({ message: "Server error.", detail: error.message });
  }
});

app.get("/api/exams-calendar", requireAuth, async (request, response) => {
  try {
    const month = String(request.query.month || "").trim();

    if (!/^\d{4}-\d{2}$/.test(month)) {
      response.status(400).json({ message: "Invalid month. Format must be YYYY-MM." });
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
  } catch (error) {
    response.status(500).json({ message: "Server error.", detail: error.message });
  }
});

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
