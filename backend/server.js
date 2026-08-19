const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config({ quiet: true });
const { validateEnv } = require("./config/validateEnv");
try {
  validateEnv();
} catch (error) {
  console.error(`Backend configuration error: ${error.message}`);
  process.exit(1);
}
const { port, frontendUrl, trustProxyHops } = require("./config/env");
const pool = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const memberRoutes = require("./routes/memberRoutes");
const {
  projectTaskRoutes,
  taskRoutes,
} = require("./routes/taskRoutes");
const {
  taskCommentRoutes,
  commentRoutes,
} = require("./routes/commentRoutes");
const { createSocketServer } = require("./socket/socket");
const notificationRoutes = require("./routes/notificationRoutes");
const activityRoutes = require("./routes/activityRoutes");
const { apiLimiter } = require("./middleware/rateLimitMiddleware");

const app = express();
const server = http.createServer(app);
const corsOptions = {
  origin(origin, callback) {
    if (!origin || origin === frontendUrl) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
const io = createSocketServer(server, frontendUrl);

app.set("io", io);
app.disable("x-powered-by");
if (trustProxyHops > 0) {
  app.set("trust proxy", trustProxyHops);
}

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "100kb" }));
app.use("/api", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/projects", memberRoutes);
app.use("/api/projects", projectTaskRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/tasks", taskCommentRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/activities", activityRoutes);

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

app.use((req, res) => {
  return res.status(404).json({ message: "Route not found" });
});

app.use((error, req, res, next) => {
  if (error?.type === "entity.too.large") {
    return res.status(413).json({ message: "Request payload is too large" });
  }
  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON payload" });
  }

  console.error("Unhandled request error");
  return res.status(500).json({ message: "Internal server error" });
});

const startServer = async () => {
  try {
    await pool.verifyConnection();
    console.log("PostgreSQL connected successfully");
    server.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch {
    console.error("Backend startup failed");
    await pool.end().catch(() => {});
    process.exitCode = 1;
  }
};

startServer();
