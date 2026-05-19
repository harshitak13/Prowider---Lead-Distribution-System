import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IAllocationCursor extends Document {
  serviceNumber: number
  nextIndex: number
  updatedAt: Date
}

const AllocationCursorSchema = new Schema<IAllocationCursor>(
  {
    serviceNumber: { type: Number, required: true, unique: true },
    nextIndex:     { type: Number, default: 0 },
  },
  { timestamps: true }
)

export const AllocationCursor: Model<IAllocationCursor> =
  mongoose.models.AllocationCursor ??
  mongoose.model<IAllocationCursor>('AllocationCursor', AllocationCursorSchema)
