import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const columnSchema = new Schema(
  {
    boardId: { type: Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    color: { type: String, default: null, trim: true },
    order: { type: Number, required: true, min: 0 },
    limit: { type: Number, default: null, min: 1 },
    archived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

columnSchema.index({ boardId: 1, order: 1 });

export type Column = InferSchemaType<typeof columnSchema>;
export type ColumnDocument = HydratedDocument<Column>;
export const ColumnModel = model<Column>('Column', columnSchema);
