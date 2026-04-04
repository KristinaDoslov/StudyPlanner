const { all, get, run } = require("../services/db");

function listSubjectsByUser(userId) {
  return all("SELECT DISTINCT subject FROM tasks WHERE user_id = ? ORDER BY subject COLLATE NOCASE ASC", [userId]);
}

function listTasksByUser(userId, filters = {}) {
  const params = [userId];
  let where = "WHERE user_id = ?";

  if (filters.subject) {
    where += " AND subject = ?";
    params.push(filters.subject);
  }

  if (filters.status) {
    where += " AND status = ?";
    params.push(filters.status);
  }

  if (filters.dueDate) {
    where += " AND due_date = ?";
    params.push(filters.dueDate);
  }

  if (filters.priority) {
    where += " AND priority = ?";
    params.push(filters.priority);
  }

  return all(
    `SELECT id, subject, type, title, description, priority, status, due_date AS dueDate
     FROM tasks
     ${where}
     ORDER BY due_date ASC, id DESC`,
    params
  );
}

async function createTask(taskData) {
  const result = await run(
    "INSERT INTO tasks(user_id, subject, type, title, description, priority, status, due_date, completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      taskData.userId,
      taskData.subject,
      taskData.type,
      taskData.title,
      taskData.description,
      taskData.priority,
      taskData.status,
      taskData.dueDate,
      taskData.status === "done" ? 1 : 0,
    ]
  );

  return get(
    "SELECT id, subject, type, title, description, priority, status, due_date AS dueDate FROM tasks WHERE id = ?",
    [result.id]
  );
}

async function updateTaskStatus(userId, taskId, status) {
  await run(
    "UPDATE tasks SET status = ?, completed = ? WHERE id = ? AND user_id = ?",
    [status, status === "done" ? 1 : 0, taskId, userId]
  );

  return get(
    "SELECT id, subject, type, title, description, priority, status, due_date AS dueDate FROM tasks WHERE id = ? AND user_id = ?",
    [taskId, userId]
  );
}

async function deleteTask(userId, taskId) {
  const result = await run("DELETE FROM tasks WHERE id = ? AND user_id = ?", [taskId, userId]);
  return result.changes > 0;
}

function listExamsForMonth(userId, month) {
  return all(
    `SELECT id, title, subject, status, priority, due_date AS dueDate
     FROM tasks
     WHERE user_id = ?
       AND type = 'ispit'
       AND substr(due_date, 1, 7) = ?
     ORDER BY due_date ASC`,
    [userId, month]
  );
}

module.exports = {
  listSubjectsByUser,
  listTasksByUser,
  createTask,
  updateTaskStatus,
  deleteTask,
  listExamsForMonth,
};
