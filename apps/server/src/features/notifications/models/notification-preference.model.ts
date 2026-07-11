import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const notificationPreferenceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    assignments: { type: Boolean, default: true },
    comments: { type: Boolean, default: true },
    mentions: { type: Boolean, default: true },
    dueDates: { type: Boolean, default: true },
    workspace: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type NotificationPreference = InferSchemaType<typeof notificationPreferenceSchema>;
export type NotificationPreferenceDocument = HydratedDocument<NotificationPreference>;
export const NotificationPreferenceModel = model<NotificationPreference>(
  'NotificationPreference',
  notificationPreferenceSchema,
);
