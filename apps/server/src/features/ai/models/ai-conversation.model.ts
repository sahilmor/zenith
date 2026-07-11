import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const aiReferenceSchema = new Schema(
  {
    type: { type: String, enum: ['workspace', 'project', 'board', 'task'], required: true },
    id: { type: String, required: true },
    label: { type: String, required: true },
  },
  { _id: false },
);

const aiMessageSchema = new Schema(
  {
    role: { type: String, enum: ['system', 'user', 'assistant'], required: true },
    content: { type: String, required: true, maxlength: 20000 },
    references: { type: [aiReferenceSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const aiConversationSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    pinned: { type: Boolean, default: false, index: true },
    provider: { type: String, enum: ['local', 'openai', 'anthropic', 'gemini'], required: true },
    messages: { type: [aiMessageSchema], default: [] },
  },
  { timestamps: true },
);

aiConversationSchema.index({ workspaceId: 1, userId: 1, updatedAt: -1 });

export type AiConversation = InferSchemaType<typeof aiConversationSchema>;
export type AiConversationDocument = HydratedDocument<AiConversation>;
export const AiConversationModel = model<AiConversation>('AiConversation', aiConversationSchema);
