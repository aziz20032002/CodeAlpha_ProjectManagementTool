const pool = require("../config/db");

const getActivities = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.project_id, a.task_id, a.type, a.message,
              a.created_at, u.id AS user_id, u.name AS user_name,
              p.name AS project_name
       FROM activities AS a
       LEFT JOIN users AS u ON u.id = a.user_id
       INNER JOIN projects AS p ON p.id = a.project_id
       INNER JOIN project_members AS pm ON pm.project_id = a.project_id
       WHERE pm.user_id = $1
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT 20`,
      [req.user.id],
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get activities request failed");
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getActivities };
