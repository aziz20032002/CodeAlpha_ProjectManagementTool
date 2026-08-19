const express = require("express");
const { register, login, getMe } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimitMiddleware");
const {
  handleValidationErrors,
  rejectUnknownFields,
} = require("../middleware/validationMiddleware");
const {
  registerValidators,
  loginValidators,
} = require("../validators/authValidators");

const router = express.Router();

router.post(
  "/register",
  authLimiter,
  rejectUnknownFields(["name", "email", "password"]),
  registerValidators,
  handleValidationErrors,
  register,
);
router.post(
  "/login",
  authLimiter,
  rejectUnknownFields(["email", "password"]),
  loginValidators,
  handleValidationErrors,
  login,
);
router.get("/me", authMiddleware, getMe);

module.exports = router;
