const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} = require("../controllers/notificationController");
const {
  handleValidationErrors,
  rejectUnknownFields,
} = require("../middleware/validationMiddleware");
const {
  notificationIdValidator,
} = require("../validators/notificationValidators");

const router = express.Router();

router.get("/", authMiddleware, getNotifications);
router.get("/unread-count", authMiddleware, getUnreadCount);
router.put(
  "/read-all",
  authMiddleware,
  rejectUnknownFields([]),
  markAllNotificationsAsRead,
);
router.put(
  "/:id/read",
  authMiddleware,
  notificationIdValidator,
  rejectUnknownFields([]),
  handleValidationErrors,
  markNotificationAsRead,
);
router.delete(
  "/:id",
  authMiddleware,
  notificationIdValidator,
  rejectUnknownFields([]),
  handleValidationErrors,
  deleteNotification,
);

module.exports = router;
