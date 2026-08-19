const pool = require("../config/db");
const {
  getUserDisplayName,
  recordActivity,
} = require("../services/activityService");

const parseProjectId = (value) => {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const createProject = async (req, res) => {
  const { name, description } = req.body;

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ message: "Project name is required" });
  }

  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    return res.status(400).json({ message: "Description must be a string" });
  }

  const client = await pool.connect().catch(() => null);

  if (!client) {
    console.error("Create project request failed");
    return res.status(500).json({ message: "Internal server error" });
  }

  try {
    await client.query("BEGIN");

    const projectResult = await client.query(
      `INSERT INTO projects (name, description, owner_id)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, owner_id, created_at`,
      [name.trim(), description ?? null, req.user.id],
    );
    const project = projectResult.rows[0];

    await client.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [project.id, req.user.id, "owner"],
    );

    await client.query("COMMIT");

    const actorName = await getUserDisplayName(req.user.id).catch(
      () => "A user",
    );
    await recordActivity({
      io: req.app.get("io"),
      projectId: project.id,
      userId: req.user.id,
      type: "project_created",
      message: `${actorName} created project "${project.name}".`,
    });

    return res.status(201).json({
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Create project request failed");
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};

const getProjects = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.name, p.description, p.owner_id, p.created_at, pm.role
       FROM projects AS p
       INNER JOIN project_members AS pm ON pm.project_id = p.id
       WHERE pm.user_id = $1
       ORDER BY p.created_at DESC`,
      [req.user.id],
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get projects request failed");
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getProjectById = async (req, res) => {
  const projectId = parseProjectId(req.params.id);

  if (!projectId) {
    return res.status(400).json({ message: "Invalid project ID" });
  }

  try {
    const projectResult = await pool.query(
      `SELECT id, name, description, owner_id, created_at
       FROM projects
       WHERE id = $1`,
      [projectId],
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: "Project not found" });
    }

    const membershipResult = await pool.query(
      `SELECT role
       FROM project_members
       WHERE project_id = $1 AND user_id = $2`,
      [projectId, req.user.id],
    );

    if (membershipResult.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "You are not a member of this project" });
    }

    return res.status(200).json({
      ...projectResult.rows[0],
      role: membershipResult.rows[0].role,
    });
  } catch (error) {
    console.error("Get project request failed");
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateProject = async (req, res) => {
  const projectId = parseProjectId(req.params.id);

  if (!projectId) {
    return res.status(400).json({ message: "Invalid project ID" });
  }

  const hasName = Object.prototype.hasOwnProperty.call(req.body, "name");
  const hasDescription = Object.prototype.hasOwnProperty.call(
    req.body,
    "description",
  );

  if (!hasName && !hasDescription) {
    return res.status(400).json({
      message: "Name or description is required",
    });
  }

  if (hasName && (typeof req.body.name !== "string" || !req.body.name.trim())) {
    return res.status(400).json({ message: "Project name cannot be empty" });
  }

  if (
    hasDescription &&
    req.body.description !== null &&
    typeof req.body.description !== "string"
  ) {
    return res.status(400).json({ message: "Description must be a string" });
  }

  try {
    const projectResult = await pool.query(
      `SELECT id, name, description, owner_id, created_at
       FROM projects
       WHERE id = $1`,
      [projectId],
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: "Project not found" });
    }

    const project = projectResult.rows[0];

    if (Number(project.owner_id) !== Number(req.user.id)) {
      return res.status(403).json({
        message: "Only the project owner can update this project",
      });
    }

    const nextName = hasName ? req.body.name.trim() : project.name;
    const nextDescription = hasDescription
      ? req.body.description
      : project.description;
    const wasModified =
      nextName !== project.name || nextDescription !== project.description;

    const result = await pool.query(
      `UPDATE projects
       SET name = $1, description = $2
       WHERE id = $3
       RETURNING id, name, description, owner_id, created_at`,
      [
        nextName,
        nextDescription,
        projectId,
      ],
    );

    if (wasModified) {
      const actorName = await getUserDisplayName(req.user.id).catch(
        () => "A user",
      );
      await recordActivity({
        io: req.app.get("io"),
        projectId,
        userId: req.user.id,
        type: "project_updated",
        message: `${actorName} updated project "${result.rows[0].name}".`,
      });
    }

    return res.status(200).json({
      message: "Project updated successfully",
      project: result.rows[0],
    });
  } catch (error) {
    console.error("Update project request failed");
    return res.status(500).json({ message: "Internal server error" });
  }
};

const deleteProject = async (req, res) => {
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
        message: "Only the project owner can delete this project",
      });
    }

    await pool.query("DELETE FROM projects WHERE id = $1", [projectId]);

    return res.status(200).json({
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Delete project request failed");
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
};
