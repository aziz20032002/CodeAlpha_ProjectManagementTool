const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

const port = Number(process.env.PORT || 3000);
const frontendUrl = new URL(process.env.FRONTEND_URL).origin;
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);

module.exports = {
  nodeEnv,
  isProduction,
  port,
  frontendUrl,
  trustProxyHops,
};
