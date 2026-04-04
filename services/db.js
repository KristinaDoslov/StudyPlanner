const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, "..", "database", "database.db");
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
      description TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'todo',
      due_date TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  const columns = await all("PRAGMA table_info(tasks)");
  const hasDescription = columns.some((column) => column.name === "description");
  const hasPriority = columns.some((column) => column.name === "priority");
  const hasStatus = columns.some((column) => column.name === "status");

  if (!hasDescription) {
    await run("ALTER TABLE tasks ADD COLUMN description TEXT NOT NULL DEFAULT ''");
  }

  if (!hasPriority) {
    await run("ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'");
  }

  if (!hasStatus) {
    await run("ALTER TABLE tasks ADD COLUMN status TEXT NOT NULL DEFAULT 'todo'");
  }

  await run(`
    UPDATE tasks
    SET status = CASE WHEN completed = 1 THEN 'done' ELSE 'todo' END
    WHERE status IS NULL OR TRIM(status) = ''
  `);

  await run("CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON tasks(user_id, due_date)");
  await run("CREATE INDEX IF NOT EXISTS idx_tasks_user_subject ON tasks(user_id, subject)");
  await run("CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status)");
  await run("CREATE INDEX IF NOT EXISTS idx_tasks_user_priority ON tasks(user_id, priority)");
}

function closeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

module.exports = {
  run,
  get,
  all,
  initializeDatabase,
  closeDatabase,
};
