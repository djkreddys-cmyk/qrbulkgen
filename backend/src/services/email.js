const { loadEnv } = require("../config/env");
const { createHttpError } = require("../lib/http-error");

async function sendResetPasswordEmail({ to, resetUrl }) {
  const env = loadEnv();

  if (!env.resendApiKey) {
    throw createHttpError(
      500,
      "EMAIL_NOT_CONFIGURED",
      "Resend API key is not configured on the backend",
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.resendFromEmail,
      to: [to],
      subject: "Reset your QRBulkGen password",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Reset your password</h2>
          <p>Use the link below to reset your QRBulkGen password.</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>This link expires soon. If you did not request it, you can ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const data = await response.text();
    throw createHttpError(502, "EMAIL_DELIVERY_FAILED", "Failed to send reset email", data);
  }
}

module.exports = {
  sendResetPasswordEmail,
};
