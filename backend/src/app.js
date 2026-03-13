const cors = require("cors");
const express = require("express");

const { loadEnv } = require("./config/env");
const { authRouter } = require("./routes/auth");

function createApp() {
  const app = express();
  const frontendUrl = loadEnv().frontendUrl.replace(/\/$/, "");
  const normalizedOrigin = new URL(frontendUrl).origin;
  const wwwOrigin = normalizedOrigin.replace("://", "://www.");
  const apexOrigin = normalizedOrigin.replace("://www.", "://");
  const allowedOrigins = new Set([normalizedOrigin, wwwOrigin, apexOrigin]);
  const corsOptions = {
    origin(origin, callback) {
      // Allow server-to-server and health checks without an Origin header.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };

  app.use(cors(corsOptions));
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
