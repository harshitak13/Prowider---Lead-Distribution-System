import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ILeadAssignment extends Document {
  _id: mongoose.Types.ObjectId
  leadId: mongoose.Types.ObjectId
  providerId: mongoose.Types.ObjectId
  providerNumber: number
  providerName: string
  leadName: string
  serviceName: string
  city: string
  assignedAt: Date
}

const LeadAssignmentSchema = new Schema<ILeadAssignment>({
  leadId:         { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
  providerId:     { type: Schema.Types.ObjectId, ref: 'Provider', required: true },
  providerNumber: { type: Number, required: true },
  providerName:   { type: String, required: true },
  leadName:       { type: String, required: true },
  serviceName:    { type: String, required: true },
  city:           { type: String, required: true },
  assignedAt:     { type: Date, default: Date.now },
})

// Same provider cannot receive the same lead twice
LeadAssignmentSchema.index({ leadId: 1, providerId: 1 }, { unique: true })

export const LeadAssignment: Model<ILeadAssignment> =
  mongoose.models.LeadAssignment ??
  mongoose.model<ILeadAssignment>('LeadAssignment', LeadAssignmentSchema)
