const { createApp } = require("./src/app");
const { loadEnv } = require("./src/config/env");
const { ensureSchema, testConnection } = require("./src/db/postgres");
const { closeRedis, testRedisConnection } = require("./src/services/redis");

async function startServer() {
  const env = loadEnv();

  await testConnection();
  await ensureSchema();
  await testRedisConnection();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`Backend listening on port ${env.port}`);
  });

  const shutdown = async (signal) => {
    console.log(`Received ${signal}, shutting down...`);
    server.close(async () => {
      await closeRedis();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startServer().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
