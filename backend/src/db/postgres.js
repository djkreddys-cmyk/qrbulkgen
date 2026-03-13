const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const { loadEnv } = require("../config/env");

const pool = new Pool({
  connectionString: loadEnv().postgresUrl,
});

async function testConnection() {
  await pool.query("SELECT 1");
}

async function query(text, params) {
  return pool.query(text, params);
}

async function withTransaction(run) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function ensureSchema() {
  const sqlPath = path.join(__dirname, "..", "schema", "init.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  await pool.query(sql);
}

module.exports = {
  pool,
  query,
  testConnection,
  withTransaction,
  ensureSchema,
};
