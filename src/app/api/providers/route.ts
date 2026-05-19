import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Provider } from '@/lib/models/Provider'
import { LeadAssignment } from '@/lib/models/LeadAssignment'

export async function GET() {
  await connectDB()

  const providers = await Provider.find().sort({ providerNumber: 1 }).lean()

  const assignments = await LeadAssignment.find()
    .sort({ assignedAt: -1 })
    .lean()

  // Group assignments by providerId
  const byProvider = new Map<string, typeof assignments>()
  for (const a of assignments) {
    const key = a.providerId.toString()
    if (!byProvider.has(key)) byProvider.set(key, [])
    byProvider.get(key)!.push(a)
  }

  const result = providers.map(p => ({
    _id: p._id.toString(),
    providerNumber: p.providerNumber,
    name: p.name,
    monthlyQuota: p.monthlyQuota,
    leadsCount: p.leadsCount,
    assignments: (byProvider.get(p._id.toString()) ?? []).map(a => ({
      _id: a._id.toString(),
      leadId: a.leadId.toString(),
      leadName: a.leadName,
      serviceName: a.serviceName,
      city: a.city,
      assignedAt: a.assignedAt,
    })),
  }))

  return NextResponse.json(result)
}
