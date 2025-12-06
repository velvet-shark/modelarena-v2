import { Queue } from "bullmq";
import Redis from "ioredis";

// Redis connection for BullMQ
const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

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

// Video generation queue
export const generationQueue = new Queue<GenerationJobData>("video-generation", {
  connection,
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
generationQueue.on("error", (error) => {
  console.error("[Queue] Error:", error);
});

export { connection };
