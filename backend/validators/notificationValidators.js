const { param } = require("express-validator");

const notificationIdValidator = param("id")
  .isInt({ min: 1 })
  .withMessage("Invalid notification ID");

module.exports = { notificationIdValidator };
