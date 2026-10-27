import { NextRequest } from "next/server";
import Redis from "ioredis";

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max requests per interval
  prefix?: string; // Separate buckets per endpoint
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Client IP as seen by our edge proxy.
 * Set CLIENT_IP_HEADER (e.g. "cf-connecting-ip") when a CDN sits in front of the
 * proxy. Otherwise use the rightmost X-Forwarded-For entry: the one our own
 * proxy appended. Leftmost entries are client-controlled and spoofable.
 */
export function getClientIp(request: NextRequest): string {
  const configured = process.env.CLIENT_IP_HEADER;
  if (configured) {
    const value = request.headers.get(configured)?.trim();
    if (value) return value;
  }

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

// Shared across instances via Redis; falls back to per-process memory if Redis
// is unavailable so voting keeps working (with weaker limits).
let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (!redis) {
    // No offline queue: while disconnected, commands fail fast and we use memory
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    redis.on("error", (err) => console.error("[RateLimit] Redis error:", err.message));
  }
  return redis;
}

const INCR_WITH_TTL = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return {count, redis.call('PTTL', KEYS[1])}
`;

const memoryStore = new Map<string, { count: number; resetTime: number }>();

function memoryHit(key: string, interval: number): { count: number; resetTime: number } {
  const now = Date.now();
  // Opportunistic cleanup instead of a module-level timer
  if (memoryStore.size > 10_000) {
    for (const [k, v] of memoryStore) if (now > v.resetTime) memoryStore.delete(k);
  }
  const record = memoryStore.get(key);
  if (!record || now > record.resetTime) {
    const fresh = { count: 1, resetTime: now + interval };
    memoryStore.set(key, fresh);
    return fresh;
  }
  record.count += 1;
  return record;
}

export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = {
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 30, // 30 requests per minute
  }
): Promise<RateLimitResult> {
  const key = `ratelimit:${config.prefix ?? "default"}:${getClientIp(request)}`;
  let count: number;
  let resetTime: number;

  const client = getRedis();
  try {
    if (!client) throw new Error("no redis");
    const [c, ttl] = (await client.eval(INCR_WITH_TTL, 1, key, config.interval)) as [number, number];
    count = c;
    resetTime = Date.now() + Math.max(ttl, 0);
  } catch {
    ({ count, resetTime } = memoryHit(key, config.interval));
  }

  return {
    success: count <= config.uniqueTokenPerInterval,
    limit: config.uniqueTokenPerInterval,
    remaining: Math.max(config.uniqueTokenPerInterval - count, 0),
    reset: resetTime,
  };
}

export function createRateLimitResponse(reset?: number) {
  const retryAfter = reset ? Math.max(Math.ceil((reset - Date.now()) / 1000), 1) : 60;
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      message: "Please try again later",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    }
  );
}
