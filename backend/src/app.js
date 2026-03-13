const express = require("express");

const { loadEnv } = require("./config/env");
const { authRouter } = require("./routes/auth");

function createApp() {
  const app = express();
  const frontendUrl = loadEnv().frontendUrl.replace(/\/$/, "");
  const normalizedOrigin = new URL(frontendUrl).origin;
  const allowedOrigins = new Set([
    normalizedOrigin,
    normalizedOrigin.replace("://www.", "://"),
    normalizedOrigin.includes("://www.")
      ? normalizedOrigin
      : normalizedOrigin.replace("://", "://www."),
  ]);

  app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin && allowedOrigins.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }

    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  });
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/auth", authRouter);

  app.use((err, _req, res, _next) => {
    console.error(err);

    res.status(err.statusCode || 500).json({
      error: {
        code: err.code || "INTERNAL_SERVER_ERROR",
        message: err.message || "Unexpected server error",
        details: err.details || null,
      },
    });
  });

  return app;
}

module.exports = {
  createApp,
};
