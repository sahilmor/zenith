import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const apiKeySchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    keyHash: { type: String, required: true, unique: true },
    prefix: { type: String, required: true, index: true },
    scopes: [{ type: String, required: true, trim: true }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastUsedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

export type ApiKey = InferSchemaType<typeof apiKeySchema>;
export type ApiKeyDocument = HydratedDocument<ApiKey>;
export const ApiKeyModel = model<ApiKey>('ApiKey', apiKeySchema);
