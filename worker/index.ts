#!/usr/bin/env node
import { createWorker } from "../src/lib/queue/worker";

console.log("🚀 Starting ModelArena video generation worker...");

// Create and start the worker
const worker = createWorker(5); // Process 5 jobs concurrently

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing worker...");
  await worker.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, closing worker...");
  await worker.close();
  process.exit(0);
});

console.log("✅ Worker started and waiting for jobs...");
