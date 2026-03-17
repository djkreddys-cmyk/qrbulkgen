const { loadEnv } = require("../config/env");
const { createHttpError } = require("../lib/http-error");

async function sendResetPasswordSms({ to, code }) {
  const env = loadEnv();

  if (env.twilioAccountSid && env.twilioAuthToken && env.twilioFromPhone) {
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`;
    const body = new URLSearchParams({
      To: to,
      From: env.twilioFromPhone,
      Body: `${code} is your QRBulkGen password reset code. It expires in ${env.resetPasswordOtpTtlMinutes} minutes.`,
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const details = await response.text();
      throw createHttpError(502, "SMS_DELIVERY_FAILED", "Failed to send reset OTP", details);
    }

    return { delivery: "sms" };
  }

  if (env.nodeEnv === "production") {
    throw createHttpError(
      500,
      "SMS_NOT_CONFIGURED",
      "Twilio credentials are not configured on the backend",
    );
  }

  console.info(`[QRBulkGen OTP Preview] ${to}: ${code}`);
  return { delivery: "preview", previewCode: code };
}

module.exports = {
  sendResetPasswordSms,
};
