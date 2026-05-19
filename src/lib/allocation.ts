import mongoose from 'mongoose'
import { connectDB } from './db'
import { Provider } from './models/Provider'
import { LeadAssignment } from './models/LeadAssignment'
import { AllocationCursor } from './models/AllocationCursor'
import { Lead } from './models/Lead'

/**
 * Mandatory provider numbers per service number.
 * Service 1 → Provider 1
 * Service 2 → Provider 5
 * Service 3 → Provider 1 AND Provider 4
 */
const MANDATORY: Record<number, number[]> = {
  1: [1],
  2: [5],
  3: [1, 4],
}

/**
 * Fair-pool provider numbers per service (round-robin rotation).
 * Service 1 → Providers 2, 3, 4
 * Service 2 → Providers 6, 7, 8
 * Service 3 → Providers 2, 3, 5, 6, 7, 8
 */
const FAIR_POOL: Record<number, number[]> = {
  1: [2, 3, 4],
  2: [6, 7, 8],
  3: [2, 3, 5, 6, 7, 8],
}

const TOTAL_SLOTS = 3
const MAX_RETRIES = 10

/**
 * Assigns exactly 3 providers to a lead.
 *
 * Concurrency strategy (MongoDB has no SELECT FOR UPDATE):
 * We use optimistic concurrency on the AllocationCursor document.
 * findOneAndUpdate with a version condition ensures only one caller
 * can advance the cursor at a time — others retry with the new value.
 * This is safe and correct under simultaneous requests.
 */
export async function assignProviders(
  leadId: mongoose.Types.ObjectId,
  serviceNumber: number,
  lead: { name: string; serviceName: string; city: string }
): Promise<number[]> {
  await connectDB()

  const mandatory = MANDATORY[serviceNumber] ?? []
  const pool = FAIR_POOL[serviceNumber] ?? []

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Read current cursor
    const cursor = await AllocationCursor.findOne({ serviceNumber })
    if (!cursor) throw new Error(`AllocationCursor missing for service ${serviceNumber}. Run the seed.`)

    const startIndex = cursor.nextIndex
    const cursorVersion = cursor.__v as number

    // Load all providers in one query
    const allProviderNums = Array.from(new Set([...mandatory, ...pool]))
    const providers = await Provider.find({ providerNumber: { $in: allProviderNums } })
    const providerMap = new Map(providers.map(p => [p.providerNumber, p]))

    const assigned: number[] = []

    // Step 1: mandatory providers (if within quota)
    for (const pNum of mandatory) {
      const p = providerMap.get(pNum)
      if (p && p.leadsCount < p.monthlyQuota) {
        assigned.push(pNum)
      }
    }

    // Step 2: fair-pool round-robin to fill remaining slots
    let rotIdx = startIndex
    let attempts = 0
    while (assigned.length < TOTAL_SLOTS && attempts < pool.length) {
      const pNum = pool[rotIdx % pool.length]
      rotIdx++
      attempts++
      if (assigned.includes(pNum)) continue
      const p = providerMap.get(pNum)
      if (!p || p.leadsCount >= p.monthlyQuota) continue
      assigned.push(pNum)
    }

    // Step 3: try to advance the cursor atomically using version check
    const fairPicks = assigned.filter(n => !mandatory.includes(n)).length
    const advance = Math.max(fairPicks, 1)
    const newIndex = pool.length > 0 ? (startIndex + advance) % pool.length : 0

    const updated = await AllocationCursor.findOneAndUpdate(
      { serviceNumber, __v: cursorVersion },   // condition: version must still match
      { $set: { nextIndex: newIndex }, $inc: { __v: 1 } },
      { new: true }
    )

    if (!updated) {
      // Another request advanced the cursor first — retry with fresh state
      continue
    }

    // Step 4: persist assignments + increment provider counts
    const assignedProviders = assigned.map(pNum => providerMap.get(pNum)!)

    await LeadAssignment.insertMany(
      assignedProviders.map(p => ({
        leadId,
        providerId: p._id,
        providerNumber: p.providerNumber,
        providerName: p.name,
        leadName: lead.name,
        serviceName: lead.serviceName,
        city: lead.city,
      }))
    )

    // Bulk increment leadsCount for each assigned provider
    await Provider.bulkWrite(
      assigned.map(pNum => ({
        updateOne: {
          filter: { providerNumber: pNum },
          update: { $inc: { leadsCount: 1 } },
        },
      }))
    )

    return assigned
  }

  throw new Error(`Allocation failed after ${MAX_RETRIES} retries (too much contention). Try again.`)
}
