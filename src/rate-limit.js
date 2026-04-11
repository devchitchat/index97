export function createRateLimiter({ windowMs = 60_000, max = 10, keyFn } = {}) {
  const defaultKeyFn = (req) =>
    req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'

  const getKey = keyFn ?? defaultKeyFn
  const store = new Map()

  function prune() {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) store.delete(key)
    }
  }

  return function limit(req) {
    prune()
    const key = getKey(req)
    const now = Date.now()
    const entry = store.get(key) ?? { count: 0, resetAt: now + windowMs }
    entry.count++
    store.set(key, entry)
    if (entry.count > max) {
      throw Object.assign(new Error('Too many requests'), { status: 429 })
    }
  }
}
