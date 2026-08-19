const express = require("express");
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
} = require("../controllers/projectController");
const authMiddleware = require("../middleware/authMiddleware");
const {
  handleValidationErrors,
  rejectUnknownFields,
  requireAtLeastOneField,
} = require("../middleware/validationMiddleware");
const {
  projectIdValidator,
  createProjectValidators,
  updateProjectValidators,
} = require("../validators/projectValidators");

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  rejectUnknownFields(["name", "description"]),
  createProjectValidators,
  handleValidationErrors,
  createProject,
);
router.get("/", authMiddleware, getProjects);
router.get(
  "/:id",
  authMiddleware,
  projectIdValidator(),
  handleValidationErrors,
  getProjectById,
);
router.put(
  "/:id",
  authMiddleware,
  projectIdValidator(),
  rejectUnknownFields(["name", "description"]),
  requireAtLeastOneField(["name", "description"]),
  updateProjectValidators,
  handleValidationErrors,
  updateProject,
);
router.delete(
  "/:id",
  authMiddleware,
  projectIdValidator(),
  handleValidationErrors,
  deleteProject,
);

module.exports = router;
