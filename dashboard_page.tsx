'use client'

import { useEffect, useState, useCallback } from 'react'

type Assignment = {
  _id: string
  leadId: string
  leadName: string
  serviceName: string
  city: string
  assignedAt: string
}

type Provider = {
  _id: string
  providerNumber: number
  name: string
  monthlyQuota: number
  leadsCount: number
  assignments: Assignment[]
}

function quotaColor(used: number, total: number): string {
  const pct = total === 0 ? 0 : used / total
  if (pct >= 1) return '#dc2626'
  if (pct >= 0.7) return '#d97706'
  return '#16a34a'
}

function ProviderCard({ provider, highlighted }: { provider: Provider; highlighted: boolean }) {
  const remaining = provider.monthlyQuota - provider.leadsCount
  const pct = provider.monthlyQuota > 0 ? (provider.leadsCount / provider.monthlyQuota) * 100 : 0
  const color = quotaColor(provider.leadsCount, provider.monthlyQuota)

  return (
    <div className={`provider-card${highlighted ? ' highlight' : ''}`}>
      <div className="provider-name">{provider.name}</div>
      <div className="provider-stats">
        <span><strong>{provider.leadsCount}</strong> received</span>
        <span><strong>{remaining}</strong> remaining</span>
        <span>/ {provider.monthlyQuota} quota</span>
      </div>

      <div className="quota-bar">
        <div
          className="quota-fill"
          style={{ width: `${Math.min(pct, 100)}%`, background: color }}
        />
      </div>

      {provider.assignments.length > 0 ? (
        <ul className="lead-list">
          {provider.assignments.slice(0, 6).map(a => (
            <li key={a._id} className="lead-item">
              <span className="lead-item-name">{a.leadName}</span>
              <span className="lead-item-meta">— {a.serviceName} · {a.city}</span>
            </li>
          ))}
          {provider.assignments.length > 6 && (
            <li className="lead-item" style={{ color: 'var(--muted)', fontSize: 12 }}>
              +{provider.assignments.length - 6} more
            </li>
          )}
        </ul>
      ) : (
        <p style={{ marginTop: '0.75rem', fontSize: 13, color: 'var(--muted)' }}>No leads assigned yet.</p>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [highlighted, setHighlighted] = useState<Set<number>>(new Set())
  const [lastUpdate, setLastUpdate] = useState<string>('')

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/providers')
      const data = await res.json()
      setProviders(data)
    } catch {
      /* network blip */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProviders()

    let es: EventSource
    let reconnectTimer: ReturnType<typeof setTimeout>

    const connect = () => {
      es = new EventSource('/api/sse')

      es.addEventListener('message', (e) => {
        try {
          const data = JSON.parse(e.data)

          if (data.type === 'connected') {
            setConnected(true)
            return
          }

          if (data.type === 'lead_created') {
            fetchProviders()
            const nums: number[] = data.assignedProviderNums ?? []
            setHighlighted(new Set(nums))
            setLastUpdate(`Lead assigned to Provider${nums.length > 1 ? 's' : ''} ${nums.join(', ')} (${data.serviceName})`)
            setTimeout(() => setHighlighted(new Set()), 3000)
          }

          if (data.type === 'quota_reset') {
            fetchProviders()
            setLastUpdate('All quotas reset via webhook.')
          }
        } catch { /* parse error */ }
      })

      es.onerror = () => {
        setConnected(false)
        es.close()
        reconnectTimer = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      es?.close()
      clearTimeout(reconnectTimer)
    }
  }, [fetchProviders])

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Provider Dashboard</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {lastUpdate && (
            <span className="badge badge-blue" style={{ fontSize: 11, maxWidth: 320, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {lastUpdate}
            </span>
          )}
          <span className="rt-indicator">
            <span className={`rt-dot${connected ? ' connected' : ''}`} />
            {connected ? 'Live' : 'Connecting…'}
          </span>
        </div>
      </div>
      <p className="page-sub">Real-time view of all provider allocations and remaining monthly quota.</p>

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading providers…</p>
      ) : (
        <div className="grid-4">
          {providers.map(p => (
            <ProviderCard
              key={p._id}
              provider={p}
              highlighted={highlighted.has(p.providerNumber)}
            />
          ))}
        </div>
      )}
    </>
  )
}
