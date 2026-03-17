function requireEnv(name, fallback) {
  const value = process.env[name] || fallback;

  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function loadEnv() {
  return {
    nodeEnv: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT || 4000),
    postgresUrl: requireEnv(
      "POSTGRES_URL",
      "postgresql://postgres:postgres@localhost:5432/qrbulkgen",
    ),
    redisUrl: requireEnv("REDIS_URL", "redis://127.0.0.1:6379"),
    authTokenBytes: Number(process.env.AUTH_TOKEN_BYTES || 32),
    frontendUrl: requireEnv("FRONTEND_URL", "http://localhost:3000"),
    backendUrl: requireEnv("BACKEND_URL", "http://localhost:4000"),
    resendApiKey: process.env.RESEND_API_KEY || "",
    resendFromEmail: requireEnv("RESEND_FROM_EMAIL", "no-reply@qrbulkgen.com"),
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
    twilioFromPhone: process.env.TWILIO_FROM_PHONE || "",
    resetPasswordTokenTtlMinutes: Number(process.env.RESET_PASSWORD_TOKEN_TTL_MINUTES || 30),
    resetPasswordOtpTtlMinutes: Number(process.env.RESET_PASSWORD_OTP_TTL_MINUTES || 10),
  };
}

module.exports = {
  loadEnv,
};
