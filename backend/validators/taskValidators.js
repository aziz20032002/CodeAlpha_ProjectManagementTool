const { body, param } = require("express-validator");
const { projectIdValidator } = require("./projectValidators");

const taskIdValidator = param("id")
  .isInt({ min: 1 })
  .withMessage("Invalid task ID");

const taskProjectIdValidator = projectIdValidator("projectId");

const titleValidator = (optional = false) => {
  let validator = body("title");
  if (optional) validator = validator.optional();
  return validator
    .isString()
    .withMessage("Task title must be a string")
    .bail()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Task title must be between 1 and 200 characters");
};

const optionalTaskFields = [
  body("description")
    .optional({ nullable: true })
    .isString()
    .withMessage("Description must be a string")
    .bail()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Description must not exceed 5000 characters"),
  body("status")
    .optional()
    .isIn(["todo", "in_progress", "done"])
    .withMessage("Invalid task status"),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Invalid task priority"),
  body("assigned_to")
    .optional({ nullable: true })
    .custom((value) => Number.isInteger(value) && value >= 1)
    .withMessage("Invalid assigned user ID"),
  body("due_date")
    .optional({ nullable: true })
    .custom((value) => {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
      }
      const [year, month, day] = value.split("-").map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
      );
    })
    .withMessage("Invalid due date"),
];

const createTaskValidators = [titleValidator(), ...optionalTaskFields];
const updateTaskValidators = [titleValidator(true), ...optionalTaskFields];

module.exports = {
  taskIdValidator,
  taskProjectIdValidator,
  createTaskValidators,
  updateTaskValidators,
};
