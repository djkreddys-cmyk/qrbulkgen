const cors = require("cors");
const express = require("express");

const { authRouter } = require("./routes/auth");

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );
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
