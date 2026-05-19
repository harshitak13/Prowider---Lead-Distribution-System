import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IWebhookEvent extends Document {
  _id: mongoose.Types.ObjectId | string
  action: string
  processedAt: Date
}

const WebhookEventSchema = new Schema<IWebhookEvent>({
  _id:         { type: String, required: true },
  action:      { type: String, required: true },
  processedAt: { type: Date, default: Date.now },
})

export const WebhookEvent: Model<IWebhookEvent> =
  mongoose.models.WebhookEvent ??
  mongoose.model<IWebhookEvent>('WebhookEvent', WebhookEventSchema)
