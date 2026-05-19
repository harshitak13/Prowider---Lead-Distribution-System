import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { connectDB } from '@/lib/db'
import { Lead } from '@/lib/models/Lead'
import { Service } from '@/lib/models/Service'
import { assignProviders } from '@/lib/allocation'
import { emit } from '@/lib/sse-emitter'

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { name, phone, city, serviceNumber, description } = body as Record<string, string>

  if (!name?.trim() || !phone?.trim() || !city?.trim() || !serviceNumber || !description?.trim()) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }

  const sNum = Number(serviceNumber)
  if (isNaN(sNum)) return NextResponse.json({ error: 'Invalid serviceNumber' }, { status: 400 })

  await connectDB()

  const service = await Service.findOne({ serviceNumber: sNum })
  if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

  try {
    const lead = await Lead.create({
      name: name.trim(),
      phone: phone.trim(),
      city: city.trim(),
      description: description.trim(),
      serviceNumber: sNum,
      serviceName: service.name,
    })

    const assignedNums = await assignProviders(lead._id, sNum, {
      name: lead.name,
      serviceName: service.name,
      city: lead.city,
    })

    emit({
      type: 'lead_created',
      leadId: lead._id.toString(),
      serviceNumber: sNum,
      serviceName: service.name,
      assignedProviderNums: assignedNums,
    })

    return NextResponse.json({ success: true, leadId: lead._id, assignedProviderNums: assignedNums })
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string }
    // MongoDB duplicate key error
    if (e.code === 11000) {
      return NextResponse.json(
        { error: 'This phone number already has a lead for this service type.' },
        { status: 409 }
      )
    }
    console.error('[POST /api/leads]', e)
    return NextResponse.json({ error: e.message ?? 'Internal server error' }, { status: 500 })
  }
}
