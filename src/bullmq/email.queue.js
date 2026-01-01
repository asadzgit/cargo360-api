const { Queue } = require('bullmq');
const redisConnection = require('./redis.connection');

/**
 * BullMQ Queue for email confirmation jobs
 * Queue name: email-confirmation-queue
 * Job name: send-confirmation-email
 */
const emailQueue = new Queue('email-confirmation-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Minimum 3 retries
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 seconds, exponential backoff
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 24 * 3600, // Keep failed jobs for 24 hours
    },
  },
});

// Log queue events for monitoring
emailQueue.on('error', (error) => {
  console.error('[Email Queue] Error:', error);
});

emailQueue.on('waiting', (jobId) => {
  console.log(`[Email Queue] Job ${jobId} is waiting`);
});

emailQueue.on('active', (job) => {
  console.log(`[Email Queue] Job ${job.id} is now active`);
});

emailQueue.on('completed', (job) => {
  console.log(`[Email Queue] Job ${job.id} completed successfully`);
});

emailQueue.on('failed', (job, err) => {
  console.error(`[Email Queue] Job ${job?.id} failed:`, err.message);
});

/**
 * Add email confirmation job to the queue
 * @param {Object} data - Job data
 * @param {string} data.email - User email address
 * @param {string} data.token - Email verification token
 * @param {string} data.name - User name
 * @returns {Promise<Job>} The created job
 */
const addEmailConfirmationJob = async (data) => {
  try {
    const job = await emailQueue.add('send-confirmation-email', {
      email: data.email,
      token: data.token,
      name: data.name,
    }, {
      // Job-specific options can be added here if needed
    });
    console.log(`[Email Queue] Added job ${job.id} for email: ${data.email}`);
    return job;
  } catch (error) {
    console.error('[Email Queue] Error adding job:', error);
    throw error;
  }
};

module.exports = {
  emailQueue,
  addEmailConfirmationJob,
};

