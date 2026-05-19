import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IProvider extends Document {
  _id: mongoose.Types.ObjectId
  providerNumber: number  // 1-8 — stable numeric ID used in allocation rules
  name: string
  monthlyQuota: number
  leadsCount: number
}

const ProviderSchema = new Schema<IProvider>({
  providerNumber: { type: Number, required: true, unique: true },
  name:           { type: String, required: true, unique: true },
  monthlyQuota:   { type: Number, default: 10 },
  leadsCount:     { type: Number, default: 0 },
})

export const Provider: Model<IProvider> =
  mongoose.models.Provider ?? mongoose.model<IProvider>('Provider', ProviderSchema)
