const pool = require("../config/db");

const parseNotificationId = (value) => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const getNotifications = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, project_id, task_id, type, message, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id],
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get notifications request failed");
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*)
       FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id],
    );
    return res.status(200).json({ count: Number(result.rows[0].count) });
  } catch (error) {
    console.error("Get unread notification count request failed");
    return res.status(500).json({ message: "Internal server error" });
  }
};

const markNotificationAsRead = async (req, res) => {
  const notificationId = parseNotificationId(req.params.id);
  if (!notificationId) {
    return res.status(400).json({ message: "Invalid notification ID" });
  }

  try {
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING id, project_id, task_id, type, message, is_read, created_at`,
      [notificationId, req.user.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Mark notification as read request failed");
    return res.status(500).json({ message: "Internal server error" });
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id],
    );
    return res.status(200).json({ message: "Notifications marked as read" });
  } catch (error) {
    console.error("Mark all notifications as read request failed");
    return res.status(500).json({ message: "Internal server error" });
  }
};

const deleteNotification = async (req, res) => {
  const notificationId = parseNotificationId(req.params.id);
  if (!notificationId) {
    return res.status(400).json({ message: "Invalid notification ID" });
  }

  try {
    const result = await pool.query(
      `DELETE FROM notifications
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [notificationId, req.user.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }
    return res
      .status(200)
      .json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Delete notification request failed");
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
};
