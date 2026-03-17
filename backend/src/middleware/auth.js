const { query } = require("../db/postgres");
const { createHttpError } = require("../lib/http-error");
const { hashToken } = require("../lib/token");

async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw createHttpError(401, "UNAUTHORIZED", "Missing or invalid authorization header");
    }

    const tokenHash = hashToken(token);
    const result = await query(
      `SELECT users.id, users.name, users.email, users.phone
       FROM sessions
       INNER JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = $1
         AND sessions.expires_at > NOW()
       LIMIT 1`,
      [tokenHash],
    );

    const user = result.rows[0];

    if (!user) {
      throw createHttpError(401, "UNAUTHORIZED", "Session is invalid or expired");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  requireAuth,
};
