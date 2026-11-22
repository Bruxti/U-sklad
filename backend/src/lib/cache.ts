import type { Redis } from 'ioredis'
import { createHash } from 'node:crypto'

// Стабильный ключ: `?a=1&b=2` и `?b=2&a=1` дают одинаковый хеш.
// `undefined`-параметры не попадают — Zod-дефолты (page=1 и т.п.)
// уже применены до вызова, поэтому они всегда present.
export function hashQuery(query: Record<string, unknown>): string {
  const normalized = Object.keys(query)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      if (query[k] !== undefined) acc[k] = query[k]
      return acc
    }, {})
  return createHash('sha1').update(JSON.stringify(normalized)).digest('hex')
}

export async function cacheGet<T>(redis: Redis, key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    // Кэш — оптимизация, а не критический путь. Падение Redis не должно
    // ломать API: просто считаем, что данные не закэшированы.
    return null
  }
}

export async function cacheSet<T>(
  redis: Redis,
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  } catch {
    // см. cacheGet
  }
}

// Идём через SCAN, а не KEYS: KEYS блокирует Redis на больших наборах
// и в проде это стоп-фактор. SCAN итеративный, безопасный.
export async function invalidateByPrefix(redis: Redis, prefix: string): Promise<number> {
  let cursor = '0'
  let deleted = 0
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100)
    cursor = next
    if (keys.length) {
      deleted += await redis.del(...keys)
    }
  } while (cursor !== '0')
  return deleted
}