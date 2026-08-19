const pool = require("../config/db");
const { projectRoom } = require("../socket/socket");

const createActivity = async ({
  projectId,
  userId = null,
  taskId = null,
  type,
  message,
}) => {
  const result = await pool.query(
    `INSERT INTO activities (project_id, user_id, task_id, type, message)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, project_id, user_id, task_id, type, message, created_at`,
    [projectId, userId, taskId, type, message],
  );

  return result.rows[0];
};

const recordActivity = async ({ io, ...activityData }) => {
  try {
    const activity = await createActivity(activityData);
    io?.to(projectRoom(activity.project_id)).emit("activity_created", {
      activity,
    });
    return activity;
  } catch (error) {
    console.error("Activity recording failed");
    return null;
  }
};

const getUserDisplayName = async (userId) => {
  const result = await pool.query("SELECT name FROM users WHERE id = $1", [userId]);
  return result.rows[0]?.name || "A user";
};

module.exports = { createActivity, recordActivity, getUserDisplayName };
