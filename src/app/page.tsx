import Link from 'next/link'

export default function Home() {
  return (
    <div className="home-hero">
      <h1>Prowider</h1>
      <p>Mini lead distribution system — submit service enquiries and watch them distribute fairly across providers in real time.</p>
      <div className="home-cards">
        <Link href="/request-service" className="home-card">
          <div className="home-card-icon">📋</div>
          <h3>Request Service</h3>
          <p>Submit a new service enquiry as a customer.</p>
        </Link>
        <Link href="/dashboard" className="home-card">
          <div className="home-card-icon">📊</div>
          <h3>Provider Dashboard</h3>
          <p>View live provider quotas and assigned leads.</p>
        </Link>
        <Link href="/test-tools" className="home-card">
          <div className="home-card-icon">🔧</div>
          <h3>Test Tools</h3>
          <p>Simulate webhooks, concurrency, and idempotency.</p>
        </Link>
      </div>
    </div>
  )
}
