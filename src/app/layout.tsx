import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Prowider — Lead Distribution',
  description: 'Mini lead distribution system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <a href="/" className="nav-brand">Prowider</a>
          <div className="nav-links">
            <a href="/request-service">Request Service</a>
            <a href="/dashboard">Dashboard</a>
            <a href="/test-tools">Test Tools</a>
          </div>
        </nav>
        <main className="container">{children}</main>
      </body>
    </html>
  )
}
