const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");
const feedback = document.getElementById("feedback");

const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

const userName = document.getElementById("user-name");
const logoutBtn = document.getElementById("logout-btn");

const taskForm = document.getElementById("task-form");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const subjectFilter = document.getElementById("subject-filter");
const statusFilter = document.getElementById("status-filter");
const priorityFilter = document.getElementById("priority-filter");
const dateFilter = document.getElementById("date-filter");

const calendarMonthInput = document.getElementById("calendar-month");
const calendarGrid = document.getElementById("calendar-grid");
const examList = document.getElementById("exam-list");

let currentUser = null;
let tasks = [];
let subjects = [];

const now = new Date();
calendarMonthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

tabLogin.addEventListener("click", () => setAuthTab("login"));
tabRegister.addEventListener("click", () => setAuthTab("register"));

loginForm.addEventListener("submit", onLogin);
registerForm.addEventListener("submit", onRegister);
logoutBtn.addEventListener("click", onLogout);
taskForm.addEventListener("submit", onCreateTask);
subjectFilter.addEventListener("change", loadTasks);
statusFilter.addEventListener("change", loadTasks);
priorityFilter.addEventListener("change", loadTasks);
dateFilter.addEventListener("change", loadTasks);
calendarMonthInput.addEventListener("change", loadCalendar);

initialize();

async function initialize() {
  try {
    const me = await api("/api/auth/me");
    currentUser = me;
    switchToApp();
    await refreshData();
  } catch {
    setAuthTab("login");
    switchToAuth();
  }
}

function setAuthTab(mode) {
  const showLogin = mode === "login";
  tabLogin.classList.toggle("active", showLogin);
  tabRegister.classList.toggle("active", !showLogin);
  loginForm.classList.toggle("hidden", !showLogin);
  registerForm.classList.toggle("hidden", showLogin);
}

async function onLogin(event) {
  event.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    currentUser = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    showFeedback("Successfully signed in.", "success");
    switchToApp();
    await refreshData();
    loginForm.reset();
  } catch (error) {
    showFeedback(error.message, "error");
  }
}

async function onRegister(event) {
  event.preventDefault();
  const name = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;

  try {
    currentUser = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });

    showFeedback("Account created successfully.", "success");
    switchToApp();
    await refreshData();
    registerForm.reset();
  } catch (error) {
    showFeedback(error.message, "error");
  }
}

async function onLogout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {
    // no-op
  }

  currentUser = null;
  tasks = [];
  subjects = [];
  renderTasks();
  renderSubjectFilter();
  renderExams([]);
  switchToAuth();
  setAuthTab("login");
  showFeedback("You have been logged out.", "success");
}

async function onCreateTask(event) {
  event.preventDefault();

  const subject = document.getElementById("subject").value.trim();
  const type = document.getElementById("type").value;
  const status = document.getElementById("status").value;
  const priority = document.getElementById("priority").value;
  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const dueDate = document.getElementById("date").value;

  if (!subject || !title || !dueDate || !status || !priority) {
    showFeedback("Please fill in all required obligation fields.", "error");
    return;
  }

  if (title.length < 1) {
    showFeedback("Title cannot be empty.", "error");
    return;
  }

  if (description.length > 300) {
    showFeedback("Description can have at most 300 characters.", "error");
    return;
  }

  if (!isFutureOrToday(dueDate)) {
    showFeedback("Due date must be today or in the future.", "error");
    return;
  }

  try {
    await api("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ subject, type, title, description, priority, status, dueDate }),
    });

    taskForm.reset();
    showFeedback("Obligation added.", "success");
    await refreshData();
  } catch (error) {
    showFeedback(error.message, "error");
  }
}

async function refreshData() {
  userName.textContent = currentUser?.name || "";
  await Promise.all([loadSubjects(), loadTasks(), loadCalendar()]);
}

async function loadSubjects() {
  subjects = await api("/api/subjects");
  renderSubjectFilter();
}

function renderSubjectFilter() {
  const selected = subjectFilter.value;
  subjectFilter.innerHTML = '<option value="">All subjects</option>';

  subjects.forEach((subject) => {
    const option = document.createElement("option");
    option.value = subject;
    option.textContent = subject;
    subjectFilter.appendChild(option);
  });

  if (["", ...subjects].includes(selected)) {
    subjectFilter.value = selected;
  }
}

async function loadTasks() {
  const subject = subjectFilter.value;
  const status = statusFilter.value;
  const priority = priorityFilter.value;
  const dueDate = dateFilter.value;

  const params = new URLSearchParams();
  if (subject) {
    params.set("subject", subject);
  }
  if (status) {
    params.set("status", status);
  }
  if (priority) {
    params.set("priority", priority);
  }
  if (dueDate) {
    params.set("dueDate", dueDate);
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  tasks = await api(`/api/tasks${query}`);
  renderTasks();
}

function renderTasks() {
  taskList.innerHTML = "";

  if (!tasks.length) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  tasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = `task-item${task.completed ? " completed" : ""}`;

    const left = document.createElement("div");
    left.className = "task-left";

    const top = document.createElement("div");
    top.className = "task-top";

    const title = document.createElement("p");
    title.className = `task-title${task.completed ? " done" : ""}`;
    title.textContent = task.title;

    const badge = document.createElement("span");
    badge.className = `badge ${task.type === "ispit" ? "badge-exam" : "badge-task"}`;
    badge.textContent = task.type === "ispit" ? "Exam" : "Task";

    const statusBadge = document.createElement("span");
    statusBadge.className = "badge badge-status";
    statusBadge.textContent = statusLabel(task.status);

    const priorityBadge = document.createElement("span");
    priorityBadge.className = "badge badge-priority";
    priorityBadge.textContent = `Priority: ${priorityLabel(task.priority)}`;

    top.append(title, badge, statusBadge, priorityBadge);

    const meta = document.createElement("p");
    meta.className = "task-meta";
    meta.textContent = `${task.subject} • Due: ${formatDate(task.dueDate)}`;

    const description = document.createElement("p");
    description.className = "task-description";
    description.textContent = task.description || "No description.";

    left.append(top, meta, description);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const statusSelect = document.createElement("select");
    statusSelect.className = "status-select";

    [
      { value: "todo", label: "To Do" },
      { value: "in_progress", label: "In Progress" },
      { value: "done", label: "Done" },
    ].forEach((optionData) => {
      const option = document.createElement("option");
      option.value = optionData.value;
      option.textContent = optionData.label;
      statusSelect.appendChild(option);
    });

    statusSelect.value = task.status || (task.completed ? "done" : "todo");
    statusSelect.addEventListener("change", async () => {
      try {
        await api(`/api/tasks/${task.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: statusSelect.value }),
        });
        await loadTasks();
      } catch (error) {
        showFeedback(error.message, "error");
      }
    });

    const del = document.createElement("button");
    del.type = "button";
    del.className = "delete-btn";
    del.textContent = "Delete";
    del.addEventListener("click", async () => {
      try {
        await api(`/api/tasks/${task.id}`, { method: "DELETE" });
        showFeedback("Obligation deleted.", "success");
        await refreshData();
      } catch (error) {
        showFeedback(error.message, "error");
      }
    });

    actions.append(statusSelect, del);
    item.append(left, actions);
    taskList.appendChild(item);
  });
}

async function loadCalendar() {
  const month = calendarMonthInput.value;

  if (!month) {
    renderCalendar([]);
    renderExams([]);
    return;
  }

  const exams = await api(`/api/exams-calendar?month=${month}`);
  renderCalendar(exams);
  renderExams(exams);
}

function renderCalendar(exams) {
  calendarGrid.innerHTML = "";

  const [year, month] = calendarMonthInput.value.split("-").map(Number);
  if (!year || !month) {
    return;
  }

  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7;

  const countByDay = exams.reduce((accumulator, exam) => {
    const day = Number(exam.dueDate.slice(8, 10));
    accumulator[day] = (accumulator[day] || 0) + 1;
    return accumulator;
  }, {});

  for (let i = 0; i < startWeekday; i += 1) {
    const blank = document.createElement("div");
    blank.className = "calendar-cell";
    calendarGrid.appendChild(blank);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const cell = document.createElement("div");
    cell.className = `calendar-cell${countByDay[day] ? " has-exam" : ""}`;

    const dayLabel = document.createElement("strong");
    dayLabel.textContent = String(day);
    cell.appendChild(dayLabel);

    if (countByDay[day]) {
      const count = document.createElement("span");
      count.className = "exam-count";
      count.textContent = `${countByDay[day]} exam(s)`;
      cell.appendChild(count);
    }

    calendarGrid.appendChild(cell);
  }
}

function renderExams(exams) {
  examList.innerHTML = "";

  if (!exams.length) {
    const item = document.createElement("li");
    item.className = "exam-item";
    item.textContent = "No exams for selected month.";
    examList.appendChild(item);
    return;
  }

  exams.forEach((exam) => {
    const item = document.createElement("li");
    item.className = "exam-item";
    item.textContent = `${formatDate(exam.dueDate)} • ${exam.subject} • ${exam.title}`;
    examList.appendChild(item);
  });
}

function switchToApp() {
  authSection.classList.add("hidden");
  appSection.classList.remove("hidden");
}

function switchToAuth() {
  appSection.classList.add("hidden");
  authSection.classList.remove("hidden");
}

function showFeedback(message, mode) {
  feedback.textContent = message;
  feedback.classList.remove("hidden", "success", "error");
  feedback.classList.add(mode);

  clearTimeout(showFeedback.timeoutId);
  showFeedback.timeoutId = setTimeout(() => {
    feedback.classList.add("hidden");
  }, 3200);
}

function formatDate(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-GB").format(date);
}

function isFutureOrToday(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

function statusLabel(status) {
  if (status === "in_progress") {
    return "In Progress";
  }
  if (status === "done") {
    return "Done";
  }
  return "To Do";
}

function priorityLabel(priority) {
  if (priority === "high") {
    return "High";
  }
  if (priority === "low") {
    return "Low";
  }
  return "Medium";
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let payload = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    payload = await response.json();
  }

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || "An error occurred.");
  }

  return payload;
}
