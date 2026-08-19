const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  createTask,
  getProjectTasks,
  getTaskById,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");
const {
  handleValidationErrors,
  rejectUnknownFields,
  requireAtLeastOneField,
} = require("../middleware/validationMiddleware");
const {
  taskIdValidator,
  taskProjectIdValidator,
  createTaskValidators,
  updateTaskValidators,
} = require("../validators/taskValidators");

const projectTaskRoutes = express.Router();
const taskRoutes = express.Router();

projectTaskRoutes.post(
  "/:projectId/tasks",
  authMiddleware,
  taskProjectIdValidator,
  rejectUnknownFields([
    "title",
    "description",
    "status",
    "priority",
    "assigned_to",
    "due_date",
  ]),
  createTaskValidators,
  handleValidationErrors,
  createTask,
);
projectTaskRoutes.get(
  "/:projectId/tasks",
  authMiddleware,
  taskProjectIdValidator,
  handleValidationErrors,
  getProjectTasks,
);

taskRoutes.get(
  "/:id",
  authMiddleware,
  taskIdValidator,
  handleValidationErrors,
  getTaskById,
);
taskRoutes.put(
  "/:id",
  authMiddleware,
  taskIdValidator,
  rejectUnknownFields([
    "title",
    "description",
    "status",
    "priority",
    "assigned_to",
    "due_date",
  ]),
  requireAtLeastOneField([
    "title",
    "description",
    "status",
    "priority",
    "assigned_to",
    "due_date",
  ]),
  updateTaskValidators,
  handleValidationErrors,
  updateTask,
);
taskRoutes.delete(
  "/:id",
  authMiddleware,
  taskIdValidator,
  handleValidationErrors,
  deleteTask,
);

module.exports = { projectTaskRoutes, taskRoutes };
