/**
 * In-process pub/sub for Server-Sent Events.
 * For multi-instance deployments, replace with Redis pub/sub (ioredis + subscribe/publish).
 */

type Listener = (data: object) => void
const listeners = new Set<Listener>()

export function subscribe(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function emit(data: object): void {
  listeners.forEach(fn => {
    try { fn(data) } catch { /* client gone */ }
  })
}
