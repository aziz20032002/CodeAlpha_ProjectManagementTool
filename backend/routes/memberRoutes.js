const express = require("express");
const {
  addMember,
  getProjectMembers,
  removeMember,
} = require("../controllers/memberController");
const authMiddleware = require("../middleware/authMiddleware");
const {
  handleValidationErrors,
  rejectUnknownFields,
} = require("../middleware/validationMiddleware");
const {
  memberEmailValidator,
  memberProjectIdValidator,
  userIdValidator,
} = require("../validators/memberValidators");

const router = express.Router();

router.post(
  "/:id/members",
  authMiddleware,
  memberProjectIdValidator,
  rejectUnknownFields(["email"]),
  memberEmailValidator,
  handleValidationErrors,
  addMember,
);
router.get(
  "/:id/members",
  authMiddleware,
  memberProjectIdValidator,
  handleValidationErrors,
  getProjectMembers,
);
router.delete(
  "/:id/members/:userId",
  authMiddleware,
  memberProjectIdValidator,
  userIdValidator,
  handleValidationErrors,
  removeMember,
);

module.exports = router;
