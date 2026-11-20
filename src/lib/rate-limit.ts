import "server-only";

/**
 * Small in-memory fixed-window rate limiter.
 *
 * Good enough for a single Node process (VPS / Docker / `next start`).
 * On serverless platforms each instance has its own memory, so treat this as
 * a speed bump there and put a real limiter (Upstash, Cloudflare, …) in front.
 */

type Bucket = { count: number; resetAt: number };

const globalStore = globalThis as unknown as { __stfRate?: Map<string, Bucket> };
const buckets = (globalStore.__stfRate ??= new Map<string, Bucket>());

const MAX_TRACKED_KEYS = 20_000;

function prune(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // Still huge? Someone is spraying keys — drop the oldest half.
  if (buckets.size > MAX_TRACKED_KEYS) {
    let toDrop = Math.floor(buckets.size / 2);
    for (const key of buckets.keys()) {
      if (toDrop-- <= 0) break;
      buckets.delete(key);
    }
  }
}

export interface RateResult {
  ok: boolean;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  if (buckets.size > MAX_TRACKED_KEYS) prune(now);

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;

  return {
    ok: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

/** Forget a key (e.g. after a successful login). */
export function clearRateLimit(key: string) {
  buckets.delete(key);
}
