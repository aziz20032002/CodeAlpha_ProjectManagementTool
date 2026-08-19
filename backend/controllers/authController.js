const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { getBcryptRounds } = require("../config/validateEnv");
const { signToken } = require("../utils/jwt");

const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    !name.trim() ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({
      message: "Name, email and password are required",
    });
  }

  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({
      message: "Password must be between 8 and 128 characters",
    });
  }

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail],
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, getBcryptRounds());
    const result = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [normalizedName, normalizedEmail, hashedPassword],
    );

    return res.status(201).json({
      message: "User registered successfully",
      user: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ message: "User already exists" });
    }

    console.error("Register request failed");
    return res.status(500).json({ message: "Internal server error" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const result = await pool.query(
      "SELECT id, name, email, password FROM users WHERE email = $1",
      [normalizedEmail],
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = signToken(user);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login request failed");
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Current user request failed");
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { register, login, getMe };
