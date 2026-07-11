import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const strategicEntityTypes = [
  'goal',
  'key_result',
  'initiative',
  'portfolio',
  'project',
  'board',
  'task',
  'milestone',
  'epic',
  'release',
];

export const strategicRelationshipTypes = [
  'supports',
  'contributes_to',
  'contains',
  'depends_on',
  'related_to',
];

const strategicLinkSchema = new Schema({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  sourceType: { type: String, enum: strategicEntityTypes, required: true, index: true },
  sourceId: { type: Schema.Types.ObjectId, required: true, index: true },
  targetType: { type: String, enum: strategicEntityTypes, required: true, index: true },
  targetId: { type: Schema.Types.ObjectId, required: true, index: true },
  relationshipType: { type: String, enum: strategicRelationshipTypes, required: true },
  weight: { type: Number, default: 1, min: 0, max: 100 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now, index: true },
});

strategicLinkSchema.index(
  { workspaceId: 1, sourceType: 1, sourceId: 1, targetType: 1, targetId: 1, relationshipType: 1 },
  { unique: true },
);
strategicLinkSchema.index({ workspaceId: 1, targetType: 1, targetId: 1 });

export type StrategicLink = InferSchemaType<typeof strategicLinkSchema>;
export type StrategicLinkDocument = HydratedDocument<StrategicLink>;
export const StrategicLinkModel = model<StrategicLink>('StrategicLink', strategicLinkSchema);
