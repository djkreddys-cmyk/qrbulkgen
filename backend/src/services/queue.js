const { Queue } = require("bullmq");
const { redis } = require("./redis");

const BULK_QR_QUEUE = "bulk-qr-jobs";

const bulkQrQueue = new Queue(BULK_QR_QUEUE, {
  connection: redis,
});

async function enqueueBulkQrJob(jobId) {
  return bulkQrQueue.add(
    "bulk-generate",
    { jobId },
    {
      jobId,
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 1,
    },
  );
}

module.exports = {
  BULK_QR_QUEUE,
  bulkQrQueue,
  enqueueBulkQrJob,
};
