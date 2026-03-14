const { query } = require("../db/postgres");

async function trackEvent({ userId = null, jobId = null, eventType, eventValue = null, metadata = null }) {
  if (!eventType) {
    return;
  }

  try {
    await query(
      `INSERT INTO analytics_events (user_id, job_id, event_type, event_value, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, jobId, eventType, eventValue, metadata ? JSON.stringify(metadata) : null],
    );
  } catch (error) {
    console.error("Failed to track analytics event", error.message);
  }
}

module.exports = {
  trackEvent,
};
