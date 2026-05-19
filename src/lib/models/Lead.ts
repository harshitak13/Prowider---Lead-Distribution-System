import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ILead extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  phone: string
  city: string
  description: string
  serviceNumber: number
  serviceName: string
  createdAt: Date
}

const LeadSchema = new Schema<ILead>(
  {
    name:          { type: String, required: true },
    phone:         { type: String, required: true },
    city:          { type: String, required: true },
    description:   { type: String, required: true },
    serviceNumber: { type: Number, required: true },
    serviceName:   { type: String, required: true },
  },
  { timestamps: true }
)

// DB-level duplicate enforcement: same phone + same service not allowed
LeadSchema.index({ phone: 1, serviceNumber: 1 }, { unique: true })

export const Lead: Model<ILead> =
  mongoose.models.Lead ?? mongoose.model<ILead>('Lead', LeadSchema)
