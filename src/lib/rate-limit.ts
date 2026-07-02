/**
 * Simple in-memory rate limiter using a sliding window.
 * Not suitable for multi-instance deployments (use Redis for that),
 * but good enough for a single instance / local deployment.
 */

type ClientRecord = {
  timestamps: number[];
};

const store = new Map<string, ClientRecord>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    // Arbitrary 5 minute cleanup
    const cutoff = now - 5 * 60 * 1000;
    record.timestamps = record.timestamps.filter((t) => t > cutoff);
    if (record.timestamps.length === 0) {
      store.delete(key);
    }
  }
}, 60 * 1000);

export function isRateLimited(
  identifier: string,
  limit: number,
  windowMs: number
): { limited: boolean; remaining: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  let record = store.get(identifier);
  if (!record) {
    record = { timestamps: [] };
    store.set(identifier, record);
  }

  // Filter timestamps within the current window
  record.timestamps = record.timestamps.filter((t) => t > windowStart);

  if (record.timestamps.length >= limit) {
    return { limited: true, remaining: 0 };
  }

  // Add the current request timestamp
  record.timestamps.push(now);

  return { limited: false, remaining: limit - record.timestamps.length };
}
