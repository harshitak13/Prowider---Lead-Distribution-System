import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Service } from '@/lib/models/Service'

export async function GET() {
  try {
    await connectDB()
    const services = await Service.find().sort({ serviceNumber: 1 }).lean()

    if (services.length === 0) {
      // Helpful message if seed was never run
      return NextResponse.json(
        { error: 'No services found. Please run: npm run db:seed' },
        { status: 404 }
      )
    }

    return NextResponse.json(services)
  } catch (err: unknown) {
    const e = err as { message?: string }
    console.error('[GET /api/services]', e)
    return NextResponse.json(
      { error: `Database error: ${e.message ?? 'Unknown error'}` },
      { status: 500 }
    )
  }
}
