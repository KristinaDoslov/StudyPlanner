const {
  createTaskForUser,
  deleteTaskForUser,
  getExamsForMonth,
  getSubjectsForUser,
  getTasksForUser,
  setTaskStatus,
} = require("../services/taskService");
const { createTaskSchema, monthQuerySchema, patchTaskSchema, taskFilterQuerySchema } = require("../validation/schemas");

function zodErrorMessage(error) {
  return error?.issues?.[0]?.message || "Invalid request payload.";
}

async function getSubjects(request, response) {
  const subjects = await getSubjectsForUser(request.session.userId);
  response.json(subjects);
}

async function listTasks(request, response) {
  const parsedFilters = taskFilterQuerySchema.safeParse({
    subject: request.query.subject,
    status: request.query.status,
    dueDate: request.query.dueDate,
    priority: request.query.priority,
  });

  if (!parsedFilters.success) {
    response.status(400).json({ error: zodErrorMessage(parsedFilters.error) });
    return;
  }

  const tasks = await getTasksForUser(request.session.userId, parsedFilters.data);
  response.json(tasks);
}

async function createTask(request, response) {
  const parsed = createTaskSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: zodErrorMessage(parsed.error) });
    return;
  }

  const { subject, type, title, description, priority, status, dueDate } = parsed.data;
  const task = await createTaskForUser(
    request.session.userId,
    subject.trim(),
    type,
    title.trim(),
    description.trim(),
    priority,
    status,
    dueDate.trim()
  );

  response.status(201).json(task);
}

async function updateTask(request, response) {
  const taskId = Number(request.params.id);
  if (!Number.isInteger(taskId)) {
    response.status(400).json({ error: "Invalid ID." });
    return;
  }

  const parsed = patchTaskSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: zodErrorMessage(parsed.error) });
    return;
  }

  const status = parsed.data.status || (parsed.data.completed ? "done" : "todo");
  const task = await setTaskStatus(request.session.userId, taskId, status);
  if (!task) {
    response.status(404).json({ error: "Obligation not found." });
    return;
  }

  response.json(task);
}

async function deleteTask(request, response) {
  const taskId = Number(request.params.id);
  if (!Number.isInteger(taskId)) {
    response.status(400).json({ error: "Invalid ID." });
    return;
  }

  const deleted = await deleteTaskForUser(request.session.userId, taskId);
  if (!deleted) {
    response.status(404).json({ error: "Obligation not found." });
    return;
  }

  response.status(204).send();
}

async function examsCalendar(request, response) {
  const parsed = monthQuerySchema.safeParse({ month: String(request.query.month || "").trim() });
  if (!parsed.success) {
    response.status(400).json({ error: zodErrorMessage(parsed.error) });
    return;
  }

  const exams = await getExamsForMonth(request.session.userId, parsed.data.month);
  response.json(exams);
}

module.exports = {
  getSubjects,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  examsCalendar,
};
