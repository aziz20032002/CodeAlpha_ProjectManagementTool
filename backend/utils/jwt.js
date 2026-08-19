const jwt = require("jsonwebtoken");

const JWT_ALGORITHM = "HS256";

const signToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      algorithm: JWT_ALGORITHM,
      expiresIn: process.env.JWT_EXPIRES_IN || "2h",
    },
  );

const verifyToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: [JWT_ALGORITHM],
  });

module.exports = { signToken, verifyToken, JWT_ALGORITHM };
