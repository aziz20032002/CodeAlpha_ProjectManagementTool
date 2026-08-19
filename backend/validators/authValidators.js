const { body } = require("express-validator");

const emailValidator = body("email")
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

const registerValidators = [
  body("name")
    .exists()
    .withMessage("Name is required")
    .bail()
    .isString()
    .withMessage("Name must be a string")
    .bail()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),
  emailValidator,
  body("password")
    .exists()
    .withMessage("Password is required")
    .bail()
    .isString()
    .withMessage("Password must be a string")
    .bail()
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be between 8 and 128 characters"),
];

const loginValidators = [
  emailValidator,
  body("password")
    .exists()
    .withMessage("Password is required")
    .bail()
    .isString()
    .withMessage("Password must be a string")
    .bail()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ max: 128 })
    .withMessage("Password must not exceed 128 characters"),
];

module.exports = { registerValidators, loginValidators };
