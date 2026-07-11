import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const commentSchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    parentCommentId: { type: Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true, trim: true, minlength: 1, maxlength: 10000 },
    mentionedUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    editedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

commentSchema.index({ taskId: 1, createdAt: 1 });

export type Comment = InferSchemaType<typeof commentSchema>;
export type CommentDocument = HydratedDocument<Comment>;
export const CommentModel = model<Comment>('Comment', commentSchema);
