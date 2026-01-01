require('dotenv').config();

const { Worker } = require('bullmq');
const redisConnection = require('./redis.connection');
const { sendVerificationEmail } = require('../services/email.service');

/**
 * BullMQ Worker for processing email confirmation jobs
 * This worker runs as a separate process and consumes jobs from the email-confirmation-queue
 */

// Create worker instance
const emailWorker = new Worker(
  'email-confirmation-queue',
  async (job) => {
    const { email, token, name } = job.data;
    
    console.log(`[Email Worker] Processing job ${job.id} for email: ${email}`);
    
    try {
      // Send verification email using the email service
      await sendVerificationEmail(email, name, token);
      
      console.log(`[Email Worker] Successfully sent verification email for job ${job.id}`);
      
      return { success: true, email };
    } catch (error) {
      console.error(`[Email Worker] Error processing job ${job.id}:`, error);
      
      // Re-throw error to trigger retry mechanism
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process up to 5 jobs concurrently
    limiter: {
      max: 10, // Maximum 10 jobs
      duration: 1000, // Per second
    },
  }
);

// Worker event handlers
emailWorker.on('completed', (job) => {
  console.log(`[Email Worker] Job ${job.id} completed successfully`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`[Email Worker] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err.message);
});

emailWorker.on('error', (err) => {
  console.error('[Email Worker] Worker error:', err);
});

emailWorker.on('active', (job) => {
  console.log(`[Email Worker] Job ${job.id} is now active`);
});

emailWorker.on('stalled', (jobId) => {
  console.warn(`[Email Worker] Job ${jobId} stalled`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Email Worker] SIGTERM received, shutting down gracefully...');
  await emailWorker.close();
  await redisConnection.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Email Worker] SIGINT received, shutting down gracefully...');
  await emailWorker.close();
  await redisConnection.quit();
  process.exit(0);
});

console.log('[Email Worker] Email worker started and ready to process jobs');
console.log('[Email Worker] Queue: email-confirmation-queue');
console.log('[Email Worker] Job name: send-confirmation-email');

module.exports = emailWorker;

