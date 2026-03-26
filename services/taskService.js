const { all, get, run } = require("./db");

async function getSubjectsForUser(userId) {
  const rows = await all(
    "SELECT DISTINCT subject FROM tasks WHERE user_id = ? ORDER BY subject COLLATE NOCASE ASC",
    [userId]
  );

  return rows.map((row) => row.subject);
}

async function getTasksForUser(userId, subjectFilter) {
  const params = [userId];
  let where = "WHERE user_id = ?";

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

  return rows.map((row) => ({
    ...row,
    completed: Boolean(row.completed),
  }));
}

async function createTaskForUser(userId, subject, type, title, dueDate) {
  const result = await run(
    "INSERT INTO tasks(user_id, subject, type, title, due_date, completed) VALUES (?, ?, ?, ?, ?, 0)",
    [userId, subject, type, title, dueDate]
  );

  const task = await get(
    "SELECT id, subject, type, title, due_date AS dueDate, completed FROM tasks WHERE id = ?",
    [result.id]
  );

  return {
    ...task,
    completed: Boolean(task.completed),
  };
}

async function setTaskCompletion(userId, taskId, completed) {
  await run(
    "UPDATE tasks SET completed = ? WHERE id = ? AND user_id = ?",
    [completed ? 1 : 0, taskId, userId]
  );

  const task = await get(
    "SELECT id, subject, type, title, due_date AS dueDate, completed FROM tasks WHERE id = ? AND user_id = ?",
    [taskId, userId]
  );

  if (!task) {
    return null;
  }

  return {
    ...task,
    completed: Boolean(task.completed),
  };
}

async function deleteTaskForUser(userId, taskId) {
  const result = await run("DELETE FROM tasks WHERE id = ? AND user_id = ?", [taskId, userId]);
  return result.changes > 0;
}

function getExamsForMonth(userId, month) {
  return all(
    `SELECT id, title, subject, due_date AS dueDate
     FROM tasks
     WHERE user_id = ?
       AND type = 'ispit'
       AND substr(due_date, 1, 7) = ?
     ORDER BY due_date ASC`,
    [userId, month]
  );
}

module.exports = {
  getSubjectsForUser,
  getTasksForUser,
  createTaskForUser,
  setTaskCompletion,
  deleteTaskForUser,
  getExamsForMonth,
};
