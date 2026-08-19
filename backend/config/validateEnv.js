const REQUIRED_ENV_VARS = [
  "DB_USER",
  "DB_HOST",
  "DB_NAME",
  "DB_PASSWORD",
  "DB_PORT",
  "JWT_SECRET",
  "FRONTEND_URL",
];

const JWT_SECRET_PLACEHOLDERS = [
  "replace_with_a_long_random_secret",
  "your_jwt_secret",
  "jwt_secret",
  "changeme",
];

const getBcryptRounds = () => {
  const configuredValue = process.env.BCRYPT_ROUNDS || "10";

  if (!/^\d+$/.test(configuredValue)) {
    throw new Error("BCRYPT_ROUNDS must be an integer between 10 and 14");
  }

  const rounds = Number.parseInt(configuredValue, 10);
  if (rounds < 10 || rounds > 14) {
    throw new Error("BCRYPT_ROUNDS must be an integer between 10 and 14");
  }

  return rounds;
};

const validateEnv = () => {
  const missingVariables = REQUIRED_ENV_VARS.filter(
    (name) => typeof process.env[name] !== "string" || !process.env[name].trim(),
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required environment configuration: ${missingVariables.join(", ")}`,
    );
  }

  const databasePort = Number(process.env.DB_PORT);
  if (!Number.isInteger(databasePort) || databasePort < 1 || databasePort > 65535) {
    throw new Error("DB_PORT must be an integer between 1 and 65535");
  }

  const nodeEnv = process.env.NODE_ENV || "development";
  if (!new Set(["development", "production", "test"]).has(nodeEnv)) {
    throw new Error("NODE_ENV must be development, production, or test");
  }

  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  let frontendUrl;
  try {
    frontendUrl = new URL(process.env.FRONTEND_URL);
  } catch {
    throw new Error("FRONTEND_URL must be a valid HTTP or HTTPS URL");
  }
  if (!["http:", "https:"].includes(frontendUrl.protocol)) {
    throw new Error("FRONTEND_URL must be a valid HTTP or HTTPS URL");
  }
  if (frontendUrl.origin !== process.env.FRONTEND_URL.replace(/\/$/, "")) {
    throw new Error("FRONTEND_URL must contain only an origin");
  }
  if (nodeEnv === "production" && frontendUrl.protocol !== "https:") {
    throw new Error("FRONTEND_URL must use HTTPS in production");
  }

  const trustProxyValue = process.env.TRUST_PROXY_HOPS || "0";
  if (!/^\d+$/.test(trustProxyValue)) {
    throw new Error("TRUST_PROXY_HOPS must be an integer between 0 and 10");
  }
  const trustProxyHops = Number(trustProxyValue);
  if (trustProxyHops < 0 || trustProxyHops > 10) {
    throw new Error("TRUST_PROXY_HOPS must be an integer between 0 and 10");
  }

  const normalizedSecret = process.env.JWT_SECRET.trim().toLowerCase();
  if (
    JWT_SECRET_PLACEHOLDERS.includes(normalizedSecret) ||
    normalizedSecret.includes("replace_with") ||
    normalizedSecret.includes("example")
  ) {
    throw new Error("JWT_SECRET must not use an example or placeholder value");
  }

  if (
    process.env.JWT_EXPIRES_IN !== undefined &&
    !process.env.JWT_EXPIRES_IN.trim()
  ) {
    throw new Error("JWT_EXPIRES_IN must not be empty when provided");
  }

  getBcryptRounds();
};

module.exports = { validateEnv, getBcryptRounds };
