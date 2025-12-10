import { Queue } from "bullmq";
import Redis from "ioredis";

// Lazy Redis connection for BullMQ
// Only throws when actually used, not at build time
function getRedisConnection() {
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL environment variable is required");
  }
  return new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });
}

let _connection: Redis | null = null;
function getConnection() {
  if (!_connection) {
    _connection = getRedisConnection();
  }
  return _connection;
}

// Job data structure for video generation
export interface GenerationJobData {
  videoId: string;
  comparisonId: string;
  modelId: string;
  prompt: string;
  sourceImageUrl?: string;
  modelEndpoint: string;
  providerName: string;
  duration?: number;
  aspectRatio?: string;
  seed?: number;
  additionalParams?: Record<string, unknown>;
}

// Lazy queue initialization
let _generationQueue: Queue<GenerationJobData> | null = null;

export function getGenerationQueue() {
  if (!_generationQueue) {
    _generationQueue = new Queue<GenerationJobData>("video-generation", {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000, // Start with 5 seconds
        },
        removeOnComplete: {
          count: 100, // Keep last 100 completed jobs
          age: 24 * 3600, // Keep for 24 hours
        },
        removeOnFail: {
          count: 500, // Keep last 500 failed jobs for debugging
        },
      },
    });

    // Log queue errors
    _generationQueue.on("error", (error) => {
      console.error("[Queue] Error:", error);
    });
  }
  return _generationQueue;
}

// Export connection getter for worker
export { getConnection };
