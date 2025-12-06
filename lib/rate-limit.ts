import { NextRequest } from "next/server";

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max requests per interval
}

const rateLimitStore = new Map<
  string,
  { count: number; resetTime: number }
>();

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = {
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 30, // 30 requests per minute
  }
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const token = `${ip}`;
  const now = Date.now();
  const windowStart = now - config.interval;

  const record = rateLimitStore.get(token);

  if (!record || now > record.resetTime) {
    // New window
    const resetTime = now + config.interval;
    rateLimitStore.set(token, { count: 1, resetTime });
    return {
      success: true,
      limit: config.uniqueTokenPerInterval,
      remaining: config.uniqueTokenPerInterval - 1,
      reset: resetTime,
    };
  }

  if (record.count >= config.uniqueTokenPerInterval) {
    // Rate limit exceeded
    return {
      success: false,
      limit: config.uniqueTokenPerInterval,
      remaining: 0,
      reset: record.resetTime,
    };
  }

  // Increment count
  record.count += 1;
  rateLimitStore.set(token, record);

  return {
    success: true,
    limit: config.uniqueTokenPerInterval,
    remaining: config.uniqueTokenPerInterval - record.count,
    reset: record.resetTime,
  };
}

export function createRateLimitResponse() {
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      message: "Please try again later",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": "60",
      },
    }
  );
}
