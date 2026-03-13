function requireEnv(name, fallback) {
  const value = process.env[name] || fallback;

  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function loadEnv() {
  return {
    port: Number(process.env.PORT || 4000),
    postgresUrl: requireEnv(
      "POSTGRES_URL",
      "postgresql://postgres:postgres@localhost:5432/qrbulkgen",
    ),
    redisUrl: requireEnv("REDIS_URL", "redis://127.0.0.1:6379"),
    authTokenBytes: Number(process.env.AUTH_TOKEN_BYTES || 32),
    frontendUrl: requireEnv("FRONTEND_URL", "http://localhost:3000"),
    resendApiKey: process.env.RESEND_API_KEY || "",
    resendFromEmail: requireEnv("RESEND_FROM_EMAIL", "no-reply@qrbulkgen.com"),
    resetPasswordTokenTtlMinutes: Number(process.env.RESET_PASSWORD_TOKEN_TTL_MINUTES || 30),
  };
}

module.exports = {
  loadEnv,
};
