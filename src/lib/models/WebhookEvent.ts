import mongoose, { Schema, Model } from 'mongoose'

// Use a plain interface (no Document extension) to avoid _id type conflict
export interface IWebhookEvent {
  _id: string           // idempotency key IS the _id
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
