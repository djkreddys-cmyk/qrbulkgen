const crypto = require("crypto");
const { loadEnv } = require("../config/env");

function generateSessionToken() {
  return crypto.randomBytes(loadEnv().authTokenBytes).toString("hex");
}

function generateOpaqueToken(byteLength = loadEnv().authTokenBytes) {
  return crypto.randomBytes(byteLength).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

module.exports = {
  generateOpaqueToken,
  generateSessionToken,
  hashToken,
};
