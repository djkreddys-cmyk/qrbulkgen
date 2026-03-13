const IORedis = require("ioredis");
const { loadEnv } = require("../config/env");

const redis = new IORedis(loadEnv().redisUrl, {
  maxRetriesPerRequest: null,
});

async function testRedisConnection() {
  await redis.ping();
}

async function closeRedis() {
  await redis.quit();
}

module.exports = {
  redis,
  testRedisConnection,
  closeRedis,
};
