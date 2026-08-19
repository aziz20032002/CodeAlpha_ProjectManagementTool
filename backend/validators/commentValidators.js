const { body, param } = require("express-validator");

const taskIdValidator = param("taskId")
  .isInt({ min: 1 })
  .withMessage("Invalid task ID");

const commentIdValidator = param("id")
  .isInt({ min: 1 })
  .withMessage("Invalid comment ID");

const contentValidator = body("content")
  .exists()
  .withMessage("Comment content is required")
  .bail()
  .isString()
  .withMessage("Comment content must be a string")
  .bail()
  .trim()
  .isLength({ min: 1, max: 5000 })
  .withMessage("Comment content must be between 1 and 5000 characters");

module.exports = { taskIdValidator, commentIdValidator, contentValidator };
