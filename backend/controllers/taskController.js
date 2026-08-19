const pool = require("../config/db");
const { emitNotification, projectRoom } = require("../socket/socket");
const { createNotification } = require("../services/notificationService");
const {
  getUserDisplayName,
  recordActivity,
} = require("../services/activityService");

const TASK_STATUSES = new Set(["todo", "in_progress", "done"]);
const TASK_PRIORITIES = new Set(["low", "medium", "high"]);
const EDITABLE_FIELDS = [
  "title",
  "description",
  "status",
  "priority",
  "due_date",
  "assigned_to",
];

const parsePositiveId = (value) => {
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    !/^\d+$/.test(String(value))
  ) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const isValidDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const validateTaskFields = (body, partial = false) => {
  const values = {};

  if (!partial || Object.prototype.hasOwnProperty.call(body, "title")) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return { error: "Task title is required" };
    }
    values.title = body.title.trim();
  }

  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    if (body.description !== null && typeof body.description !== "string") {
      return { error: "Description must be a string" };
    }
    values.description =
      typeof body.description === "string" ? body.description.trim() : null;
  } else if (!partial) {
    values.description = null;
  }

  if (Object.prototype.hasOwnProperty.call(body, "status")) {
    if (!TASK_STATUSES.has(body.status)) {
      return { error: "Invalid task status" };
    }
    values.status = body.status;
  } else if (!partial) {
    values.status = "todo";
  }

  if (Object.prototype.hasOwnProperty.call(body, "priority")) {
    if (!TASK_PRIORITIES.has(body.priority)) {
      return { error: "Invalid task priority" };
    }
    values.priority = body.priority;
  } else if (!partial) {
    values.priority = "medium";
  }

  if (Object.prototype.hasOwnProperty.call(body, "due_date")) {
    if (body.due_date !== null && !isValidDate(body.due_date)) {
      return { error: "Invalid due date" };
    }
    values.due_date = body.due_date;
  } else if (!partial) {
    values.due_date = null;
  }

  if (Object.prototype.hasOwnProperty.call(body, "assigned_to")) {
    if (body.assigned_to === null) {
      values.assigned_to = null;
    } else {
      const assignedTo = parsePositiveId(body.assigned_to);
      if (!assignedTo) {
        return { error: "Invalid assigned user ID" };
      }
      values.assigned_to = assignedTo;
    }
  } else if (!partial) {
    values.assigned_to = null;
  }

  return { values };
};

const ensureAssignedUser = async (projectId, assignedTo) => {
  if (assignedTo === null || assignedTo === undefined) {
    return null;
  }

  const userResult = await pool.query("SELECT id FROM users WHERE id = $1", [
    assignedTo,
  ]);
  if (userResult.rows.length === 0) {
    return { status: 404, message: "Assigned user not found" };
  }

  const membershipResult = await pool.query(
    `SELECT id FROM project_members
     WHERE project_id = $1 AND user_id = $2`,
    [projectId, assignedTo],
  );
  if (membershipResult.rows.length === 0) {
    return { status: 400, message: "Assigned user must be a project member" };
  }

  return null;
};

const getTaskWithUsers = async (taskId) =>
  pool.query(
    `SELECT t.id, t.project_id, t.assigned_to, t.created_by,
            t.title, t.description, t.status, t.priority, t.due_date,
            t.created_at, t.updated_at,
            CASE WHEN assigned.id IS NULL THEN NULL ELSE json_build_object(
              'id', assigned.id, 'name', assigned.name, 'email', assigned.email
            ) END AS assigned_user,
            json_build_object('id', creator.id, 'name', creator.name) AS creator
     FROM tasks AS t
     LEFT JOIN users AS assigned ON assigned.id = t.assigned_to
     INNER JOIN users AS creator ON creator.id = t.created_by
     WHERE t.id = $1`,
    [taskId],
  );

const createTask = async (req, res) => {
  const projectId = parsePositiveId(req.params.projectId);
  if (!projectId) {
    return res.status(400).json({ message: "Invalid project ID" });
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
        message: "Only the project owner can create and assign tasks",
      });
    }

    const validation = validateTaskFields(req.body);
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const assignmentError = await ensureAssignedUser(
      projectId,
      validation.values.assigned_to,
    );
    if (assignmentError) {
      return res
        .status(assignmentError.status)
        .json({ message: assignmentError.message });
    }

    const values = validation.values;
    const result = await pool.query(
      `INSERT INTO tasks (
         project_id, assigned_to, created_by, title, description,
         status, priority, due_date
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, project_id, assigned_to, created_by, title, description,
                 status, priority, due_date, created_at, updated_at`,
      [
        projectId,
        values.assigned_to,
        req.user.id,
        values.title,
        values.description,
        values.status,
        values.priority,
        values.due_date,
      ],
    );

    const createdTaskResult = await getTaskWithUsers(result.rows[0].id);
    const task = createdTaskResult.rows[0];
    if (
      task.assigned_to !== null &&
      Number(task.assigned_to) !== Number(req.user.id)
    ) {
      const notification = await createNotification({
        userId: task.assigned_to,
        projectId,
        taskId: task.id,
        type: "task_assigned",
        message: `You were assigned to task "${task.title}".`,
      });
      emitNotification(req.app.get("io"), notification);
    }
    req.app.get("io")?.to(projectRoom(projectId)).emit("task_created", {
      task,
    });
    const actorName = await getUserDisplayName(req.user.id).catch(
      () => "A user",
    );
    await recordActivity({
      io: req.app.get("io"),
      projectId,
      userId: req.user.id,
      taskId: task.id,
      type: "task_created",
      message: `${actorName} created task "${task.title}".`,
    });

    return res.status(201).json({
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    console.error("Create task request failed");
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getProjectTasks = async (req, res) => {
  const projectId = parsePositiveId(req.params.projectId);
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
      `SELECT id FROM project_members
       WHERE project_id = $1 AND user_id = $2`,
      [projectId, req.user.id],
    );
    if (membershipResult.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "You are not a member of this project" });
    }

    const result = await pool.query(
      `SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date,
              t.created_at, t.updated_at,
              CASE WHEN assigned.id IS NULL THEN NULL ELSE json_build_object(
                'id', assigned.id, 'name', assigned.name, 'email', assigned.email
              ) END AS assigned_user,
              json_build_object('id', creator.id, 'name', creator.name) AS creator
       FROM tasks AS t
       LEFT JOIN users AS assigned ON assigned.id = t.assigned_to
       INNER JOIN users AS creator ON creator.id = t.created_by
       WHERE t.project_id = $1
       ORDER BY t.created_at DESC`,
      [projectId],
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get project tasks request failed");
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getTaskById = async (req, res) => {
  const taskId = parsePositiveId(req.params.id);
  if (!taskId) {
    return res.status(400).json({ message: "Invalid task ID" });
  }

  try {
    const taskResult = await getTaskWithUsers(taskId);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    const task = taskResult.rows[0];
    const membershipResult = await pool.query(
      `SELECT id FROM project_members
       WHERE project_id = $1 AND user_id = $2`,
      [task.project_id, req.user.id],
    );
    if (membershipResult.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "You are not a member of this project" });
    }

    return res.status(200).json(task);
  } catch (error) {
    console.error("Get task request failed");
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateTask = async (req, res) => {
  const taskId = parsePositiveId(req.params.id);
  if (!taskId) {
    return res.status(400).json({ message: "Invalid task ID" });
  }

  const suppliedFields = EDITABLE_FIELDS.filter((field) =>
    Object.prototype.hasOwnProperty.call(req.body, field),
  );
  if (suppliedFields.length === 0) {
    return res.status(400).json({ message: "No valid task fields provided" });
  }

  const validation = validateTaskFields(req.body, true);
  if (validation.error) {
    return res.status(400).json({ message: validation.error });
  }

  try {
    const taskResult = await pool.query(
      `SELECT t.id, t.project_id, t.assigned_to, t.created_by, t.title,
              t.description, t.status, t.priority, t.due_date,
              p.owner_id,
              EXISTS (
                SELECT 1 FROM project_members pm
                WHERE pm.project_id = t.project_id AND pm.user_id = $2
              ) AS is_member
       FROM tasks AS t
       INNER JOIN projects AS p ON p.id = t.project_id
       WHERE t.id = $1`,
      [taskId, req.user.id],
    );
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    const task = taskResult.rows[0];
    const canUpdate =
      task.is_member &&
      (Number(task.owner_id) === Number(req.user.id) ||
        Number(task.created_by) === Number(req.user.id));
    if (!canUpdate) {
      return res
        .status(403)
        .json({ message: "You are not allowed to update this task" });
    }

    if (Object.prototype.hasOwnProperty.call(validation.values, "assigned_to")) {
      const assignmentError = await ensureAssignedUser(
        task.project_id,
        validation.values.assigned_to,
      );
      if (assignmentError) {
        return res
          .status(assignmentError.status)
          .json({ message: assignmentError.message });
      }
    }

    const parameters = [];
    const assignments = suppliedFields.map((field) => {
      parameters.push(validation.values[field]);
      return `${field} = $${parameters.length}`;
    });
    parameters.push(taskId);

    await pool.query(
      `UPDATE tasks
       SET ${assignments.join(", ")}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${parameters.length}`,
      parameters,
    );
    const updatedTask = await getTaskWithUsers(taskId);
    const updated = updatedTask.rows[0];
    const normalizeTaskField = (field, value) => {
      if (field === "assigned_to") return value === null ? null : Number(value);
      if (field === "due_date" && value) return String(value).slice(0, 10);
      return value ?? null;
    };
    const wasModified = suppliedFields.some(
      (field) =>
        normalizeTaskField(field, task[field]) !==
        normalizeTaskField(field, updated[field]),
    );
    const assignedToWasUpdated = Object.prototype.hasOwnProperty.call(
      validation.values,
      "assigned_to",
    );
    if (
      assignedToWasUpdated &&
      updated.assigned_to !== null &&
      Number(updated.assigned_to) !== Number(task.assigned_to) &&
      Number(updated.assigned_to) !== Number(req.user.id)
    ) {
      const notification = await createNotification({
        userId: updated.assigned_to,
        projectId: task.project_id,
        taskId: updated.id,
        type: "task_reassigned",
        message: `You were assigned to task "${updated.title}".`,
      });
      emitNotification(req.app.get("io"), notification);
    }
    req.app
      .get("io")
      ?.to(projectRoom(task.project_id))
      .emit("task_updated", { task: updated });

    if (wasModified) {
      const actorName = await getUserDisplayName(req.user.id).catch(
        () => "A user",
      );
      const wasCompleted = task.status !== "done" && updated.status === "done";
      await recordActivity({
        io: req.app.get("io"),
        projectId: task.project_id,
        userId: req.user.id,
        taskId: updated.id,
        type: wasCompleted ? "task_completed" : "task_updated",
        message: wasCompleted
          ? `${actorName} completed task "${updated.title}".`
          : `${actorName} updated task "${updated.title}".`,
      });
    }

    return res.status(200).json({
      message: "Task updated successfully",
      task: updated,
    });
  } catch (error) {
    console.error("Update task request failed");
    return res.status(500).json({ message: "Internal server error" });
  }
};

const deleteTask = async (req, res) => {
  const taskId = parsePositiveId(req.params.id);
  if (!taskId) {
    return res.status(400).json({ message: "Invalid task ID" });
  }

  try {
    const taskResult = await pool.query(
      `SELECT t.id, t.project_id, t.created_by, t.title, p.owner_id,
              EXISTS (
                SELECT 1 FROM project_members pm
                WHERE pm.project_id = t.project_id AND pm.user_id = $2
              ) AS is_member
       FROM tasks AS t
       INNER JOIN projects AS p ON p.id = t.project_id
       WHERE t.id = $1`,
      [taskId, req.user.id],
    );
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    const task = taskResult.rows[0];
    const canDelete =
      task.is_member &&
      (Number(task.owner_id) === Number(req.user.id) ||
        Number(task.created_by) === Number(req.user.id));
    if (!canDelete) {
      return res
        .status(403)
        .json({ message: "You are not allowed to delete this task" });
    }

    const result = await pool.query(
      "DELETE FROM tasks WHERE id = $1 RETURNING id",
      [taskId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    req.app
      .get("io")
      ?.to(projectRoom(task.project_id))
      .emit("task_deleted", { taskId });

    const actorName = await getUserDisplayName(req.user.id).catch(
      () => "A user",
    );
    await recordActivity({
      io: req.app.get("io"),
      projectId: task.project_id,
      userId: req.user.id,
      taskId: null,
      type: "task_deleted",
      message: `${actorName} deleted task "${task.title}".`,
    });

    return res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete task request failed");
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  createTask,
  getProjectTasks,
  getTaskById,
  updateTask,
  deleteTask,
};
