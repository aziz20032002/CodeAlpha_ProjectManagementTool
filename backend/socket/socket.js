const { Server } = require("socket.io");
const { verifyToken } = require("../utils/jwt");
const pool = require("../config/db");

const parseProjectId = (value) => {
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    !/^\d+$/.test(String(value))
  ) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const projectRoom = (projectId) => `project:${projectId}`;
const userRoom = (userId) => `user:${userId}`;

const removeUserFromProjectRoom = (io, projectId, userId) => {
  if (!io) return;
  io.in(userRoom(userId)).socketsLeave(projectRoom(projectId));
};

const emitNotification = (io, notification) => {
  if (!io || !notification?.user_id) return;

  io.to(userRoom(notification.user_id)).emit("notification_created", {
    notification: {
      id: notification.id,
      project_id: notification.project_id,
      task_id: notification.task_id,
      type: notification.type,
      message: notification.message,
      is_read: notification.is_read,
      created_at: notification.created_at,
    },
  });
};

const createSocketServer = (
  server,
  allowedOrigin,
) => {
  const io = new Server(server, {
    cors: {
      origin: [allowedOrigin],
      methods: ["GET", "POST"],
    },
    allowRequest(request, callback) {
      const origin = request.headers.origin;
      callback(null, !origin || origin === allowedOrigin);
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }

    try {
      const decoded = verifyToken(token);
      const userId = Number(decoded.id);
      if (!Number.isSafeInteger(userId) || userId <= 0) {
        return next(new Error("Authentication error"));
      }

      socket.user = { id: userId, email: decoded.email };
      return next();
    } catch (error) {
      return next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    socket.join(userRoom(socket.user.id));

    socket.on("join_project", async (payload = {}, acknowledge) => {
      const projectId = parseProjectId(payload.projectId);
      if (!projectId) {
        if (typeof acknowledge === "function") {
          acknowledge({ ok: false, message: "Project access denied" });
        }
        return;
      }

      try {
        const membershipResult = await pool.query(
          `SELECT 1
           FROM project_members
           WHERE project_id = $1 AND user_id = $2`,
          [projectId, socket.user.id],
        );

        if (membershipResult.rows.length === 0) {
          if (typeof acknowledge === "function") {
            acknowledge({ ok: false, message: "Project access denied" });
          }
          return;
        }

        await socket.join(projectRoom(projectId));
        if (typeof acknowledge === "function") {
          acknowledge({ ok: true });
        }
      } catch (error) {
        console.error("Socket project authorization failed");
        if (typeof acknowledge === "function") {
          acknowledge({ ok: false, message: "Project access denied" });
        }
      }
    });

    socket.on("leave_project", (payload = {}) => {
      const projectId = parseProjectId(payload.projectId);
      if (projectId) {
        socket.leave(projectRoom(projectId));
      }
    });
  });

  return io;
};

module.exports = {
  createSocketServer,
  projectRoom,
  userRoom,
  emitNotification,
  removeUserFromProjectRoom,
};
