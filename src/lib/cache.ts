type CacheEntry<T> = { value: T; expiresAt: number };

const mem = new Map<string, CacheEntry<unknown>>();
let redis: { get: (k: string) => Promise<string | null>; set: (k: string, v: string, ...rest: unknown[]) => Promise<unknown> } | null = null;
let redisTried = false;

async function getRedis() {
  if (redisTried) return redis;
  redisTried = true;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    const Redis = (await import('ioredis')).default;
    const client = new Redis(url, { maxRetriesPerRequest: 1, enableOfflineQueue: false, lazyConnect: true });
    if (typeof (client as any).connect === 'function') {
      try {
        await (client as any).connect();
      } catch {
        /* ignore connect error */
      }
    }
    redis = client as any;
    return redis;
  } catch {
    redis = null;
    return null;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = await getRedis();
  if (r) {
    try {
      const raw = await r.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      /* fall through */
    }
  }
  const hit = mem.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    mem.delete(key);
    return null;
  }
  return hit.value as T;
}

export async function cacheSet<T>(key: string, value: T, ttlMs: number): Promise<void> {
  const r = await getRedis();
  if (r) {
    try {
      await r.set(key, JSON.stringify(value), 'PX', ttlMs);
    } catch {
      /* ignore */
    }
  }
  mem.set(key, { value, expiresAt: Date.now() + ttlMs });
}

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}
