const pool = require("../config/db");
const { emitNotification, projectRoom } = require("../socket/socket");
const { createNotification } = require("../services/notificationService");
const { recordActivity } = require("../services/activityService");

const parsePositiveId = (value) => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const findTask = (taskId) =>
  pool.query(
    `SELECT t.id, t.project_id, t.assigned_to, t.title, p.owner_id
     FROM tasks AS t
     INNER JOIN projects AS p ON p.id = t.project_id
     WHERE t.id = $1`,
    [taskId],
  );

const isProjectMember = async (projectId, userId) => {
  const result = await pool.query(
    `SELECT id
     FROM project_members
     WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId],
  );
  return result.rows.length > 0;
};

const getCommentWithAuthor = (commentId) =>
  pool.query(
    `SELECT c.id, c.task_id, c.content, c.created_at,
            json_build_object(
              'id', u.id,
              'name', u.name,
              'email', u.email
            ) AS author
     FROM comments AS c
     INNER JOIN users AS u ON u.id = c.user_id
     WHERE c.id = $1`,
    [commentId],
  );

const addComment = async (req, res) => {
  const taskId = parsePositiveId(req.params.taskId);
  if (!taskId) {
    return res.status(400).json({ message: "Invalid task ID" });
  }

  try {
    const taskResult = await findTask(taskId);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    const task = taskResult.rows[0];
    if (!(await isProjectMember(task.project_id, req.user.id))) {
      return res
        .status(403)
        .json({ message: "You are not a member of this project" });
    }

    if (typeof req.body.content !== "string" || !req.body.content.trim()) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    const result = await pool.query(
      `INSERT INTO comments (task_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, task_id, user_id, content, created_at`,
      [taskId, req.user.id, req.body.content.trim()],
    );
    const createdComment = await getCommentWithAuthor(result.rows[0].id);
    const comment = createdComment.rows[0];
    const notificationRecipients = new Set();
    const authorId = Number(req.user.id);
    const assignedUserId = Number(task.assigned_to);
    const ownerId = Number(task.owner_id);

    if (task.assigned_to !== null && assignedUserId !== authorId) {
      notificationRecipients.add(assignedUserId);
    }
    if (task.owner_id !== null && ownerId !== authorId) {
      notificationRecipients.add(ownerId);
    }

    for (const recipientId of notificationRecipients) {
      const notification = await createNotification({
        userId: recipientId,
        projectId: task.project_id,
        taskId,
        type: "task_comment",
        message: `${comment.author.name} commented on task "${task.title}".`,
      });
      emitNotification(req.app.get("io"), notification);
    }
    req.app
      .get("io")
      ?.to(projectRoom(task.project_id))
      .emit("comment_created", { taskId, comment });
    await recordActivity({
      io: req.app.get("io"),
      projectId: task.project_id,
      userId: req.user.id,
      taskId,
      type: "comment_added",
      message: `${comment.author.name} commented on task "${task.title}".`,
    });

    return res.status(201).json({
      message: "Comment added successfully",
      comment,
    });
  } catch (error) {
    console.error("Add comment request failed");
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getTaskComments = async (req, res) => {
  const taskId = parsePositiveId(req.params.taskId);
  if (!taskId) {
    return res.status(400).json({ message: "Invalid task ID" });
  }

  try {
    const taskResult = await findTask(taskId);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    const task = taskResult.rows[0];
    if (!(await isProjectMember(task.project_id, req.user.id))) {
      return res
        .status(403)
        .json({ message: "You are not a member of this project" });
    }

    const result = await pool.query(
      `SELECT c.id, c.content, c.created_at,
              json_build_object(
                'id', u.id,
                'name', u.name,
                'email', u.email
              ) AS author
       FROM comments AS c
       INNER JOIN users AS u ON u.id = c.user_id
       WHERE c.task_id = $1
       ORDER BY c.created_at ASC`,
      [taskId],
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get task comments request failed");
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateComment = async (req, res) => {
  const commentId = parsePositiveId(req.params.id);
  if (!commentId) {
    return res.status(400).json({ message: "Invalid comment ID" });
  }

  try {
    const commentResult = await pool.query(
      `SELECT c.id, c.task_id, c.user_id, c.content, t.project_id,
              EXISTS (
                SELECT 1 FROM project_members pm
                WHERE pm.project_id = t.project_id AND pm.user_id = $2
              ) AS is_member
       FROM comments AS c
       INNER JOIN tasks AS t ON t.id = c.task_id
       WHERE c.id = $1`,
      [commentId, req.user.id],
    );
    if (commentResult.rows.length === 0) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const comment = commentResult.rows[0];
    if (
      !comment.is_member ||
      Number(comment.user_id) !== Number(req.user.id)
    ) {
      return res.status(403).json({
        message: "You are not allowed to update this comment",
      });
    }

    if (typeof req.body.content !== "string" || !req.body.content.trim()) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    const result = await pool.query(
      `UPDATE comments
       SET content = $1
       WHERE id = $2
       RETURNING id, task_id, user_id, content, created_at`,
      [req.body.content.trim(), commentId],
    );
    const updatedComment = await getCommentWithAuthor(result.rows[0].id);
    const updated = updatedComment.rows[0];
    req.app
      .get("io")
      ?.to(projectRoom(comment.project_id))
      .emit("comment_updated", {
        taskId: Number(comment.task_id),
        comment: updated,
      });

    return res.status(200).json({
      message: "Comment updated successfully",
      comment: updated,
    });
  } catch (error) {
    console.error("Update comment request failed");
    return res.status(500).json({ message: "Internal server error" });
  }
};

const deleteComment = async (req, res) => {
  const commentId = parsePositiveId(req.params.id);
  if (!commentId) {
    return res.status(400).json({ message: "Invalid comment ID" });
  }

  try {
    const commentResult = await pool.query(
      `SELECT c.id, c.task_id, c.user_id, t.project_id, p.owner_id,
              EXISTS (
                SELECT 1 FROM project_members pm
                WHERE pm.project_id = t.project_id AND pm.user_id = $2
              ) AS is_member
       FROM comments AS c
       INNER JOIN tasks AS t ON t.id = c.task_id
       INNER JOIN projects AS p ON p.id = t.project_id
       WHERE c.id = $1`,
      [commentId, req.user.id],
    );
    if (commentResult.rows.length === 0) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const comment = commentResult.rows[0];
    const isAuthor = Number(comment.user_id) === Number(req.user.id);
    const isOwner = Number(comment.owner_id) === Number(req.user.id);
    if (!comment.is_member || (!isAuthor && !isOwner)) {
      return res.status(403).json({
        message: "You are not allowed to delete this comment",
      });
    }

    const result = await pool.query(
      "DELETE FROM comments WHERE id = $1 RETURNING id",
      [commentId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Comment not found" });
    }

    req.app
      .get("io")
      ?.to(projectRoom(comment.project_id))
      .emit("comment_deleted", {
        taskId: Number(comment.task_id),
        commentId,
      });

    return res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Delete comment request failed");
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  addComment,
  getTaskComments,
  updateComment,
  deleteComment,
};
