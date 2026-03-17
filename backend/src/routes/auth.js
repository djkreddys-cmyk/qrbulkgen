const express = require("express");

const { loadEnv } = require("../config/env");
const { query, withTransaction } = require("../db/postgres");
const { createHttpError } = require("../lib/http-error");
const { hashPassword, verifyPassword } = require("../lib/password");
const { generateOpaqueToken, hashToken } = require("../lib/token");
const { requireAuth } = require("../middleware/auth");
const { trackEvent } = require("../services/analytics");
const { sendResetPasswordEmail } = require("../services/email");

const authRouter = express.Router();
const SESSION_TTL_DAYS = 30;

function normalizePhone(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) {
    return `+${cleaned.slice(1).replace(/\+/g, "")}`;
  }
  return cleaned.replace(/\+/g, "");
}

function validateRegisterPayload(body) {
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = normalizePhone(body.phone);
  const password = String(body.password || "");

  if (!email || !phone || !password) {
    throw createHttpError(400, "VALIDATION_ERROR", "Name, email, mobile number, and password are required");
  }

  if (body.name !== undefined && !name) {
    throw createHttpError(400, "VALIDATION_ERROR", "Name is required");
  }

  if (name.length > 120) {
    throw createHttpError(400, "VALIDATION_ERROR", "Name must be at most 120 characters");
  }

  if (password.length < 8) {
    throw createHttpError(400, "VALIDATION_ERROR", "Password must be at least 8 characters long");
  }

  return { name, email, phone, password };
}

function validateLoginPayload(body) {
  const identifier = String(body.identifier || body.email || body.phone || "").trim();
  const email = identifier.includes("@") ? identifier.toLowerCase() : "";
  const phone = email ? "" : normalizePhone(identifier);
  const password = String(body.password || "");

  if ((!email && !phone) || !password) {
    throw createHttpError(400, "VALIDATION_ERROR", "Email or mobile number and password are required");
  }

  if (password.length < 8) {
    throw createHttpError(400, "VALIDATION_ERROR", "Password must be at least 8 characters long");
  }

  return { email, phone, password };
}

async function createSession(userId, db = { query }) {
  const token = generateOpaqueToken();
  const tokenHash = hashToken(token);

  await db.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '${SESSION_TTL_DAYS} days')`,
    [userId, tokenHash],
  );

  return token;
}

function buildResetPasswordUrl(token) {
  const baseUrl = loadEnv().frontendUrl.replace(/\/$/, "");
  return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const { name, email, phone, password } = validateRegisterPayload(req.body);

    const result = await withTransaction(async (client) => {
      const existingUser = await client.query(
        "SELECT id FROM users WHERE email = $1 OR phone = $2 LIMIT 1",
        [email, phone],
      );

      if (existingUser.rows[0]) {
        throw createHttpError(409, "ACCOUNT_ALREADY_EXISTS", "An account with this email or mobile number already exists");
      }

      const insertedUser = await client.query(
        `INSERT INTO users (name, email, phone, password_hash)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, phone`,
        [name, email, phone, hashPassword(password)],
      );

      const user = insertedUser.rows[0];
      const token = await createSession(user.id, client);

      return { user, token };
    });

    res.status(201).json(result);
    await trackEvent({
      userId: result.user.id,
      eventType: "auth.register",
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, phone, password } = validateLoginPayload(req.body);

    const result = await query(
      "SELECT id, name, email, phone, password_hash FROM users WHERE email = $1 OR phone = $2 LIMIT 1",
      [email || null, phone || null],
    );

    const user = result.rows[0];

    if (!user || !verifyPassword(password, user.password_hash)) {
      throw createHttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const token = await createSession(user.id);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      token,
    });
    await trackEvent({
      userId: user.id,
      eventType: "auth.login",
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone || "",
    },
  });
});

authRouter.post("/forgot-password", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!email) {
      throw createHttpError(400, "VALIDATION_ERROR", "Email is required");
    }

    const result = await query(
      "SELECT id, email FROM users WHERE email = $1 LIMIT 1",
      [email],
    );

    const user = result.rows[0];

    if (user) {
      const rawToken = generateOpaqueToken();
      const tokenHash = hashToken(rawToken);
      const ttlMinutes = loadEnv().resetPasswordTokenTtlMinutes;

      await withTransaction(async (client) => {
        await client.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [user.id]);
        await client.query(
          `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
           VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 minute'))`,
          [user.id, tokenHash, ttlMinutes],
        );
      });

      await sendResetPasswordEmail({
        to: user.email,
        resetUrl: buildResetPasswordUrl(rawToken),
      });
    }

    res.json({
      message: "If the email is registered, a reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/reset-password", async (req, res, next) => {
  try {
    const token = String(req.body.token || "");
    const password = String(req.body.password || "");

    if (!token || !password) {
      throw createHttpError(400, "VALIDATION_ERROR", "Token and password are required");
    }

    if (password.length < 8) {
      throw createHttpError(400, "VALIDATION_ERROR", "Password must be at least 8 characters long");
    }

    const tokenHash = hashToken(token);

    await withTransaction(async (client) => {
      const result = await client.query(
        `SELECT user_id
         FROM password_reset_tokens
         WHERE token_hash = $1
           AND expires_at > NOW()
         LIMIT 1`,
        [tokenHash],
      );

      const resetToken = result.rows[0];

      if (!resetToken) {
        throw createHttpError(400, "INVALID_RESET_TOKEN", "Reset link is invalid or expired");
      }

      await client.query(
        `UPDATE users
         SET password_hash = $1, updated_at = NOW()
         WHERE id = $2`,
        [hashPassword(password), resetToken.user_id],
      );

      await client.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [resetToken.user_id]);
      await client.query("DELETE FROM sessions WHERE user_id = $1", [resetToken.user_id]);
    });

    res.json({
      message: "Password reset successful. Please log in again.",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = {
  authRouter,
};
