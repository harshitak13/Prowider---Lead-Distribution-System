import { NextRequest } from 'next/server'
import { subscribe } from '@/lib/sse-emitter'

// Must use Node.js runtime — Edge runtime doesn't support long-lived streams
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()
  let cleanup: (() => void) | null = null

  const stream = new ReadableStream({
    start(controller) {
      // Initial connection acknowledgement
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'))

      // Heartbeat every 20s to keep the connection alive through proxies/load balancers
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          clearInterval(heartbeat)
        }
      }, 20_000)

      // Subscribe to in-process events
      const unsubscribe = subscribe((data) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          /* client disconnected */
        }
      })

      cleanup = () => {
        clearInterval(heartbeat)
        unsubscribe()
        try { controller.close() } catch { /* already closed */ }
      }

      // Clean up when the client disconnects
      req.signal.addEventListener('abort', () => cleanup?.())
    },
    cancel() {
      cleanup?.()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering for SSE
    },
  })
}
