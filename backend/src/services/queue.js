const { Queue } = require("bullmq");
const { redis } = require("./redis");

const BULK_QR_QUEUE = "bulk-qr-jobs";

const bulkQrQueue = new Queue(BULK_QR_QUEUE, {
  connection: redis,
});

module.exports = {
  BULK_QR_QUEUE,
  bulkQrQueue,
};
