import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IService extends Document {
  _id: mongoose.Types.ObjectId
  serviceNumber: number   // 1, 2, 3  — stable numeric ID used in allocation rules
  name: string
}

const ServiceSchema = new Schema<IService>({
  serviceNumber: { type: Number, required: true, unique: true },
  name:          { type: String, required: true, unique: true },
})

export const Service: Model<IService> =
  mongoose.models.Service ?? mongoose.model<IService>('Service', ServiceSchema)
