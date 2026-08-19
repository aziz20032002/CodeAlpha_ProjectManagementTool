const pool = require("../config/db");

const createNotification = async ({
  userId,
  projectId = null,
  taskId = null,
  type,
  message,
}) => {
  if (!userId) {
    throw new Error("Notification userId is required");
  }

  const result = await pool.query(
    `INSERT INTO notifications (user_id, project_id, task_id, type, message)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, project_id, task_id, type, message, is_read, created_at`,
    [userId, projectId, taskId, type, message],
  );

  return result.rows[0];
};

module.exports = { createNotification };
