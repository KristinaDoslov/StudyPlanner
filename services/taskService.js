const {
  listSubjectsByUser,
  listTasksByUser,
  createTask,
  updateTaskStatus,
  deleteTask,
  listExamsForMonth,
} = require("../models/taskModel");

async function getSubjectsForUser(userId) {
  const rows = await listSubjectsByUser(userId);

  return rows.map((row) => row.subject);
}

function mapTaskRow(row) {
  return {
    ...row,
    completed: row.status === "done",
  };
}

async function getTasksForUser(userId, filters = {}) {
  const rows = await listTasksByUser(userId, filters);

  return rows.map(mapTaskRow);
}

async function createTaskForUser(userId, subject, type, title, description, priority, status, dueDate) {
  const task = await createTask({
    userId,
    subject,
    type,
    title,
    description,
    priority,
    status,
    dueDate,
  });

  return mapTaskRow(task);
}

async function setTaskStatus(userId, taskId, status) {
  const task = await updateTaskStatus(userId, taskId, status);

  if (!task) {
    return null;
  }

  return mapTaskRow(task);
}

async function deleteTaskForUser(userId, taskId) {
  return deleteTask(userId, taskId);
}

function getExamsForMonth(userId, month) {
  return listExamsForMonth(userId, month);
}

module.exports = {
  getSubjectsForUser,
  getTasksForUser,
  createTaskForUser,
  setTaskStatus,
  deleteTaskForUser,
  getExamsForMonth,
};
