import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { WebhookEvent } from '@/lib/models/WebhookEvent'
import { Provider } from '@/lib/models/Provider'
import { AllocationCursor } from '@/lib/models/AllocationCursor'
import { emit } from '@/lib/sse-emitter'

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { idempotencyKey, action } = body as { idempotencyKey?: string; action?: string }

  if (!idempotencyKey) return NextResponse.json({ error: 'idempotencyKey is required' }, { status: 400 })
  if (!action) return NextResponse.json({ error: 'action is required' }, { status: 400 })

  await connectDB()

  // Idempotency check
  const existing = await WebhookEvent.findById(idempotencyKey)
  if (existing) {
    return NextResponse.json({
      status: 'already_processed',
      processedAt: existing.processedAt,
      message: 'This webhook event was already handled. No changes made.',
    })
  }

  if (action === 'reset_quota') {
    // Record the event first (if this write succeeds but the next fails,
    // the key is consumed but quota wasn't reset — safe: prevents double-reset)
    try {
      await WebhookEvent.create({ _id: idempotencyKey, action })
    } catch (e: unknown) {
      const err = e as { code?: number }
      // Race: another request inserted the same key between our check and insert
      if (err.code === 11000) {
        const ev = await WebhookEvent.findById(idempotencyKey)
        return NextResponse.json({ status: 'already_processed', processedAt: ev?.processedAt })
      }
      throw e
    }

    await Provider.updateMany({}, { $set: { leadsCount: 0, monthlyQuota: 10 } })
    await AllocationCursor.updateMany({}, { $set: { nextIndex: 0 } })

    emit({ type: 'quota_reset' })

    return NextResponse.json({ status: 'ok', message: 'All provider quotas reset to 10.' })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
}
