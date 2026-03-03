type RateLimitState = {
  count: number;
  resetAt: number;
};

const limiterStore = new Map<string, RateLimitState>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = limiterStore.get(key);

  if (!existing || existing.resetAt <= now) {
    limiterStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= max) {
    return false;
  }

  existing.count += 1;
  return true;
}
