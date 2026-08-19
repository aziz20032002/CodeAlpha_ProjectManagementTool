const { body, param } = require("express-validator");
const { projectIdValidator } = require("./projectValidators");

const memberEmailValidator = body("email")
  .exists()
  .withMessage("Email is required")
  .bail()
  .isString()
  .withMessage("Email must be a string")
  .bail()
  .trim()
  .isLength({ max: 254 })
  .withMessage("Email must not exceed 254 characters")
  .bail()
  .isEmail()
  .withMessage("Enter a valid email address")
  .normalizeEmail();

const memberProjectIdValidator = projectIdValidator("id");
const userIdValidator = param("userId")
  .isInt({ min: 1 })
  .withMessage("Invalid user ID");

module.exports = {
  memberEmailValidator,
  memberProjectIdValidator,
  userIdValidator,
};
