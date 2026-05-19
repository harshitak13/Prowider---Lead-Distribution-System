'use client'

import { useState, useRef } from 'react'

type LogEntry = { msg: string; level: 'ok' | 'err' | 'info'; time: string }

const INDIAN_NAMES = ['Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Sneha Iyer', 'Vikram Mehta', 'Anjali Singh', 'Rohan Gupta', 'Deepa Nair', 'Arjun Rao', 'Kavya Reddy']
const INDIAN_CITIES = ['Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Surat']

function now() { return new Date().toLocaleTimeString() }

// Generate a valid 10-digit Indian mobile number starting with 6-9
function genPhone(index: number): string {
  const prefix = ['6', '7', '8', '9'][index % 4]
  const mid = String(Date.now()).slice(-6)
  const suffix = String(index).padStart(3, '0')
  return (prefix + mid + suffix).slice(0, 10)
}

export default function TestTools() {
  const [log, setLog] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const lastWebhookKey = useRef<string | null>(null)

  const addLog = (msg: string, level: LogEntry['level'] = 'info') =>
    setLog(l => [{ msg, level, time: now() }, ...l])

  const setLoad = (key: string, v: boolean) =>
    setLoading(l => ({ ...l, [key]: v }))

  // ── Webhook: fresh reset ──────────────────────────────────────────────────
  const resetQuota = async () => {
    const key = `wh-${Date.now()}-${Math.random().toString(36).slice(2)}`
    lastWebhookKey.current = key
    setLoad('reset', true)
    addLog(`Calling webhook with new key: ${key}`, 'info')
    try {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey: key, action: 'reset_quota' }),
      })
      const data = await res.json()
      addLog(`${res.status} → ${JSON.stringify(data)}`, res.ok ? 'ok' : 'err')
    } catch (e) {
      addLog(`Network error: ${e}`, 'err')
    } finally {
      setLoad('reset', false)
    }
  }

  // ── Webhook: replay same key (idempotency test) ───────────────────────────
  const replayWebhook = async () => {
    const key = lastWebhookKey.current
    if (!key) {
      addLog('No previous webhook call. Click "Reset Quotas" first.', 'err')
      return
    }
    setLoad('replay', true)
    addLog(`Replaying same key: ${key} → expect "already_processed"`, 'info')
    try {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey: key, action: 'reset_quota' }),
      })
      const data = await res.json()
      const level = data.status === 'already_processed' ? 'ok' : 'err'
      addLog(`${res.status} → ${JSON.stringify(data)}`, level)
    } catch (e) {
      addLog(`Network error: ${e}`, 'err')
    } finally {
      setLoad('replay', false)
    }
  }

  // ── Generate 10 concurrent leads ──────────────────────────────────────────
  const generateLeads = async () => {
    setLoad('gen', true)
    addLog('Firing 10 concurrent lead requests via Promise.all...', 'info')
    const serviceNums = [1, 2, 3]

    const promises = Array.from({ length: 10 }, (_, i) => {
      const sNum = serviceNums[i % 3]
      return fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: INDIAN_NAMES[i % INDIAN_NAMES.length],
          phone: genPhone(i),
          city: INDIAN_CITIES[i % INDIAN_CITIES.length],
          serviceNumber: sNum,
          description: `Concurrency test lead ${i + 1} for Service ${sNum}`,
        }),
      })
        .then(async r => ({ i, status: r.status, data: await r.json() }))
        .catch(e => ({ i, status: 0, data: { error: String(e) } }))
    })

    const results = await Promise.all(promises)
    let ok = 0, err = 0
    for (const r of results) {
      const level = r.status === 200 ? 'ok' : 'err'
      if (level === 'ok') ok++; else err++
      addLog(`Lead ${r.i + 1}: ${r.status} → ${JSON.stringify(r.data)}`, level)
    }
    addLog(`Done. ${ok} created, ${err} failed/skipped.`, ok > 0 ? 'ok' : 'err')
    setLoad('gen', false)
  }

  // ── Single test lead per service ──────────────────────────────────────────
  const singleLead = async (serviceNumber: number) => {
    const key = `single-${serviceNumber}`
    setLoad(key, true)
    const idx = Math.floor(Math.random() * INDIAN_NAMES.length)
    addLog(`Creating single lead for Service ${serviceNumber}...`, 'info')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: INDIAN_NAMES[idx],
          phone: genPhone(Date.now() % 100),
          city: INDIAN_CITIES[idx % INDIAN_CITIES.length],
          serviceNumber,
          description: `Manual test lead for Service ${serviceNumber}`,
        }),
      })
      const data = await res.json()
      addLog(`${res.status} → ${JSON.stringify(data)}`, res.ok ? 'ok' : 'err')
    } catch (e) {
      addLog(`Network error: ${e}`, 'err')
    } finally {
      setLoad(key, false)
    }
  }

  return (
    <>
      <h1 className="page-title">Test Tools</h1>
      <p className="page-sub">
        Simulate webhook events, test idempotency, and generate concurrent leads.
        These actions are separate from the customer-facing form.
      </p>

      {/* ── Webhook ── */}
      <div className="tool-section">
        <div className="card">
          <h2>Webhook: Quota Reset</h2>
          <p>
            Simulates a payment gateway confirming a provider subscription. Resets all provider quotas to 10.
            The second button replays the <strong>same</strong> idempotency key — quota must <strong>not</strong> reset again.
          </p>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={resetQuota} disabled={loading['reset']}>
              {loading['reset'] ? 'Calling…' : '✅ Reset All Quotas (new webhook)'}
            </button>
            <button className="btn btn-secondary" onClick={replayWebhook} disabled={loading['replay']}>
              {loading['replay'] ? 'Calling…' : '🔁 Replay Same Key (idempotency test)'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Concurrency ── */}
      <div className="tool-section">
        <div className="card">
          <h2>Concurrency: 10 Simultaneous Leads</h2>
          <p>
            Fires 10 lead creation requests in parallel via <code>Promise.all</code>.
            Tests that allocation handles concurrent requests without quota over-spend or double-assignment.
          </p>
          <div className="btn-row">
            <button className="btn btn-warning" onClick={generateLeads} disabled={loading['gen']}>
              {loading['gen'] ? 'Running…' : '⚡ Generate 10 Leads Simultaneously'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Single leads ── */}
      <div className="tool-section">
        <div className="card">
          <h2>Single Lead per Service</h2>
          <p>Create one lead at a time to inspect the allocation result for each service.</p>
          <div className="btn-row">
            {[1, 2, 3].map(sNum => (
              <button
                key={sNum}
                className="btn btn-secondary"
                onClick={() => singleLead(sNum)}
                disabled={loading[`single-${sNum}`]}
              >
                {loading[`single-${sNum}`] ? 'Creating…' : `+ Lead for Service ${sNum}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Log ── */}
      <div className="tool-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Log</h2>
          <button className="btn btn-secondary" style={{ fontSize: 12, padding: '3px 10px' }} onClick={() => setLog([])}>
            Clear
          </button>
        </div>
        <div className="log-panel">
          {log.length === 0 && (
            <span style={{ color: '#6b7280' }}>No activity yet. Click a button above.</span>
          )}
          {log.map((l, i) => (
            <div key={i} className={`log-item ${l.level}`}>
              <span style={{ opacity: 0.5 }}>{l.time}</span> {l.msg}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
