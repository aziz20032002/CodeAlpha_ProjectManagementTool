const pool = require("../config/db");
const { removeUserFromProjectRoom } = require("../socket/socket");
const {
  getUserDisplayName,
  recordActivity,
} = require("../services/activityService");

const parseProjectId = (value) => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const addMember = async (req, res) => {
  const projectId = parseProjectId(req.params.id);

  if (!projectId) {
    return res.status(400).json({ message: "Invalid project ID" });
  }

  try {
    const projectResult = await pool.query(
      "SELECT owner_id FROM projects WHERE id = $1",
      [projectId],
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (Number(projectResult.rows[0].owner_id) !== Number(req.user.id)) {
      return res.status(403).json({
        message: "Only the project owner can add members",
      });
    }

    if (typeof req.body.email !== "string" || !req.body.email.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    const email = req.body.email.trim().toLowerCase();
    const userResult = await pool.query(
      "SELECT id, name, email FROM users WHERE email = $1",
      [email],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userResult.rows[0];
    const membershipResult = await pool.query(
      `SELECT id
       FROM project_members
       WHERE project_id = $1 AND user_id = $2`,
      [projectId, user.id],
    );

    if (membershipResult.rows.length > 0) {
      return res.status(400).json({
        message: "User is already a project member",
      });
    }

    const insertResult = await pool.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, 'member')
       RETURNING id, project_id, user_id, role, joined_at`,
      [projectId, user.id],
    );
    const membership = insertResult.rows[0];

    const actorName = await getUserDisplayName(req.user.id).catch(
      () => "A user",
    );
    await recordActivity({
      io: req.app.get("io"),
      projectId,
      userId: req.user.id,
      type: "member_added",
      message: `${actorName} added ${user.name} to the project.`,
    });

    return res.status(201).json({
      message: "Member added successfully",
      member: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: membership.role,
        joined_at: membership.joined_at,
      },
    });
  } catch (error) {
    console.error("Add member request failed");
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getProjectMembers = async (req, res) => {
  const projectId = parseProjectId(req.params.id);

  if (!projectId) {
    return res.status(400).json({ message: "Invalid project ID" });
  }

  try {
    const projectResult = await pool.query(
      "SELECT id FROM projects WHERE id = $1",
      [projectId],
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: "Project not found" });
    }

    const membershipResult = await pool.query(
      `SELECT id
       FROM project_members
       WHERE project_id = $1 AND user_id = $2`,
      [projectId, req.user.id],
    );

    if (membershipResult.rows.length === 0) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    const membersResult = await pool.query(
      `SELECT u.id, u.name, u.email, pm.role, pm.joined_at
       FROM project_members AS pm
       INNER JOIN users AS u ON u.id = pm.user_id
       WHERE pm.project_id = $1
       ORDER BY CASE WHEN pm.role = 'owner' THEN 0 ELSE 1 END,
                pm.joined_at ASC`,
      [projectId],
    );

    return res.status(200).json(membersResult.rows);
  } catch (error) {
    console.error("Get project members request failed");
    return res.status(500).json({ message: "Internal server error" });
  }
};

const removeMember = async (req, res) => {
  const projectId = parseProjectId(req.params.id);

  if (!projectId) {
    return res.status(400).json({ message: "Invalid project ID" });
  }

  const userId = parseProjectId(req.params.userId);

  if (!userId) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const projectResult = await pool.query(
      "SELECT id, owner_id FROM projects WHERE id = $1",
      [projectId],
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: "Project not found" });
    }

    const project = projectResult.rows[0];

    if (Number(project.owner_id) !== Number(req.user.id)) {
      return res.status(403).json({
        message: "Only the project owner can remove members",
      });
    }

    if (Number(userId) === Number(project.owner_id)) {
      return res.status(400).json({
        message: "The project owner cannot be removed",
      });
    }

    const membershipResult = await pool.query(
      `SELECT pm.id, pm.role, u.name
       FROM project_members AS pm
       INNER JOIN users AS u ON u.id = pm.user_id
       WHERE pm.project_id = $1 AND pm.user_id = $2`,
      [projectId, userId],
    );

    if (membershipResult.rows.length === 0) {
      return res.status(404).json({ message: "Project member not found" });
    }

    const deleteResult = await pool.query(
      `DELETE FROM project_members
       WHERE project_id = $1 AND user_id = $2
       RETURNING id`,
      [projectId, userId],
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ message: "Project member not found" });
    }

    removeUserFromProjectRoom(req.app.get("io"), projectId, userId);

    const actorName = await getUserDisplayName(req.user.id).catch(
      () => "A user",
    );
    await recordActivity({
      io: req.app.get("io"),
      projectId,
      userId: req.user.id,
      type: "member_removed",
      message: `${actorName} removed ${membershipResult.rows[0].name} from the project.`,
    });

    return res.status(200).json({ message: "Member removed successfully" });
  } catch (error) {
    console.error("Remove member request failed");
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { addMember, getProjectMembers, removeMember };
