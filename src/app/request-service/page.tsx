'use client'

import { useState, useEffect } from 'react'

type Service = { _id: string; serviceNumber: number; name: string }

export default function RequestService() {
  const [services, setServices] = useState<Service[]>([])
  const [servicesError, setServicesError] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', city: '', serviceNumber: '', description: '' })
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/services')
      .then(async r => {
        const data = await r.json()
        if (!r.ok) {
          setServicesError(data.error ?? 'Failed to load services.')
        } else {
          setServices(data)
          setServicesError('')
        }
      })
      .catch(() => setServicesError('Could not connect to server. Check your database connection.'))
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    setStatus(null)
    if (!form.name || !form.phone || !form.city || !form.serviceNumber || !form.description) {
      setStatus({ type: 'error', msg: 'Please fill in all fields.' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, serviceNumber: Number(form.serviceNumber) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus({ type: 'error', msg: data.error ?? 'Something went wrong.' })
      } else {
        setStatus({
          type: 'success',
          msg: `Lead submitted! Assigned to ${data.assignedProviderNums.length} provider(s): ${data.assignedProviderNums.map((n: number) => `Provider ${n}`).join(', ')}.`,
        })
        setForm({ name: '', phone: '', city: '', serviceNumber: '', description: '' })
      }
    } catch {
      setStatus({ type: 'error', msg: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h1 className="page-title">Request a Service</h1>
      <p className="page-sub">Fill in your details and we will connect you with the right providers.</p>

      <div className="card" style={{ maxWidth: 560 }}>
        <div className="form">

          <div className="field">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              placeholder="Rahul Sharma"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              type="tel"
              placeholder="9876543210"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="city">City</label>
            <input
              id="city"
              type="text"
              placeholder="Mumbai"
              value={form.city}
              onChange={e => set('city', e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="service">Service Type</label>
            {servicesError ? (
              <div className="alert alert-error" style={{ marginTop: 0 }}>
                ⚠️ {servicesError}
              </div>
            ) : (
              <select
                id="service"
                value={form.serviceNumber}
                onChange={e => set('serviceNumber', e.target.value)}
              >
                <option value="">
                  {services.length === 0 ? 'Loading services...' : 'Select a service...'}
                </option>
                {services.map(s => (
                  <option key={s._id} value={s.serviceNumber}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              placeholder="Describe what you need..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={loading || !!servicesError || services.length === 0}
            style={{ alignSelf: 'flex-start' }}
          >
            {loading ? 'Submitting...' : 'Submit Enquiry'}
          </button>

          {status && (
            <div className={`alert alert-${status.type === 'success' ? 'success' : 'error'}`}>
              {status.msg}
            </div>
          )}

        </div>
      </div>

      {/* Help box shown when services fail to load */}
      {servicesError && (
        <div className="card" style={{ maxWidth: 560, marginTop: '1rem', background: '#fffbeb', borderColor: '#fcd34d' }}>
          <p style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: 14 }}>⚙️ Setup required</p>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            The database has no services yet. Run this command in your project folder:
          </p>
          <pre style={{ background: '#111', color: '#6ee7b7', padding: '0.6rem 0.8rem', borderRadius: 5, fontSize: 13, marginTop: '0.5rem' }}>npm run db:seed</pre>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: '0.5rem' }}>
            Then refresh this page.
          </p>
        </div>
      )}
    </>
  )
}
