import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI!
if (!MONGODB_URI) { console.error('Set MONGODB_URI in .env'); process.exit(1) }

// Inline minimal schemas to avoid import issues in ts-node
const ServiceSchema = new mongoose.Schema({ serviceNumber: { type: Number, unique: true }, name: { type: String, unique: true } })
const ProviderSchema = new mongoose.Schema({ providerNumber: { type: Number, unique: true }, name: { type: String, unique: true }, monthlyQuota: { type: Number, default: 10 }, leadsCount: { type: Number, default: 0 } })
const CursorSchema = new mongoose.Schema({ serviceNumber: { type: Number, unique: true }, nextIndex: { type: Number, default: 0 } }, { timestamps: true })

const Service  = (mongoose.models.Service  ?? mongoose.model('Service',  ServiceSchema))  as mongoose.Model<any>
const Provider = (mongoose.models.Provider ?? mongoose.model('Provider', ProviderSchema)) as mongoose.Model<any>
const Cursor   = (mongoose.models.AllocationCursor ?? mongoose.model('AllocationCursor', CursorSchema)) as mongoose.Model<any>

async function main() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  // Services
  for (const [num, name] of [[1,'Service 1'],[2,'Service 2'],[3,'Service 3']] as [number,string][]) {
    await Service.findOneAndUpdate({ serviceNumber: num }, { serviceNumber: num, name }, { upsert: true, new: true })
    console.log(`  ✓ ${name}`)
  }

  // 8 Providers
  for (let i = 1; i <= 8; i++) {
    await Provider.findOneAndUpdate(
      { providerNumber: i },
      { providerNumber: i, name: `Provider ${i}`, monthlyQuota: 10, leadsCount: 0 },
      { upsert: true, new: true }
    )
    console.log(`  ✓ Provider ${i}`)
  }

  // Allocation cursors
  for (const num of [1, 2, 3]) {
    await Cursor.findOneAndUpdate({ serviceNumber: num }, { serviceNumber: num, nextIndex: 0 }, { upsert: true, new: true })
    console.log(`  ✓ Cursor for Service ${num}`)
  }

  console.log('\nSeed complete.')
  await mongoose.disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
