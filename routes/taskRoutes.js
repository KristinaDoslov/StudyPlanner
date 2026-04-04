const express = require("express");
const requireAuth = require("../middlewares/requireAuth");
const { asyncHandler } = require("../middlewares/errorHandler");
const {
  getSubjects,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  examsCalendar,
} = require("../controllers/taskController");

const router = express.Router();

router.use(requireAuth);

router.get("/subjects", asyncHandler(getSubjects));
router.get("/tasks", asyncHandler(listTasks));
router.post("/tasks", asyncHandler(createTask));
router.patch("/tasks/:id", asyncHandler(updateTask));
router.delete("/tasks/:id", asyncHandler(deleteTask));
router.get("/exams-calendar", asyncHandler(examsCalendar));

module.exports = router;
