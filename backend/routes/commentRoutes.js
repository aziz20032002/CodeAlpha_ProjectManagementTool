const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  addComment,
  getTaskComments,
  updateComment,
  deleteComment,
} = require("../controllers/commentController");
const {
  handleValidationErrors,
  rejectUnknownFields,
} = require("../middleware/validationMiddleware");
const {
  taskIdValidator,
  commentIdValidator,
  contentValidator,
} = require("../validators/commentValidators");

const taskCommentRoutes = express.Router();
const commentRoutes = express.Router();

taskCommentRoutes.post(
  "/:taskId/comments",
  authMiddleware,
  taskIdValidator,
  rejectUnknownFields(["content"]),
  contentValidator,
  handleValidationErrors,
  addComment,
);
taskCommentRoutes.get(
  "/:taskId/comments",
  authMiddleware,
  taskIdValidator,
  handleValidationErrors,
  getTaskComments,
);

commentRoutes.put(
  "/:id",
  authMiddleware,
  commentIdValidator,
  rejectUnknownFields(["content"]),
  contentValidator,
  handleValidationErrors,
  updateComment,
);
commentRoutes.delete(
  "/:id",
  authMiddleware,
  commentIdValidator,
  handleValidationErrors,
  deleteComment,
);

module.exports = { taskCommentRoutes, commentRoutes };
