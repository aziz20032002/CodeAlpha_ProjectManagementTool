const { body, param } = require("express-validator");

const projectIdValidator = (parameter = "id") =>
  param(parameter)
    .isInt({ min: 1 })
    .withMessage("Invalid project ID");

const projectName = (optional = false) => {
  let validator = body("name");
  if (optional) validator = validator.optional();
  return validator
    .isString()
    .withMessage("Project name must be a string")
    .bail()
    .trim()
    .isLength({ min: 1, max: 150 })
    .withMessage("Project name must be between 1 and 150 characters");
};

const projectDescription = body("description")
  .optional({ nullable: true })
  .isString()
  .withMessage("Description must be a string")
  .bail()
  .trim()
  .isLength({ max: 2000 })
  .withMessage("Description must not exceed 2000 characters");

const createProjectValidators = [projectName(), projectDescription];
const updateProjectValidators = [projectName(true), projectDescription];

module.exports = {
  projectIdValidator,
  createProjectValidators,
  updateProjectValidators,
};
