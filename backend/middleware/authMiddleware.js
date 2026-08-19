const { verifyToken } = require("../utils/jwt");

const authMiddleware = (req, res, next) => {
  const authorization = req.get("Authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;
