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
  const title = document.getElementById("title").value.trim();
  const dueDate = document.getElementById("date").value;

  if (!subject || !title || !dueDate) {
    showFeedback("Please fill in all obligation fields.", "error");
    return;
  }

  try {
    await api("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ subject, type, title, dueDate }),
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
  const query = subject ? `?subject=${encodeURIComponent(subject)}` : "";
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

    top.append(title, badge);

    const meta = document.createElement("p");
    meta.className = "task-meta";
    meta.textContent = `${task.subject} • Due: ${formatDate(task.dueDate)}`;

    left.append(top, meta);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const completed = document.createElement("input");
    completed.type = "checkbox";
    completed.className = "complete-checkbox";
    completed.checked = task.completed;
    completed.title = "Mark as completed";
    completed.addEventListener("change", async () => {
      try {
        await api(`/api/tasks/${task.id}`, {
          method: "PATCH",
          body: JSON.stringify({ completed: completed.checked }),
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

    actions.append(completed, del);
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
