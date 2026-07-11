import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const formSubmissionSchema = new Schema(
  {
    formId: { type: Schema.Types.ObjectId, ref: 'IntakeForm', required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    values: { type: Schema.Types.Mixed, default: {} },
    createdTaskId: { type: Schema.Types.ObjectId, ref: 'Task', default: null },
    status: { type: String, enum: ['accepted', 'failed'], default: 'accepted', index: true },
    errorSummary: { type: String, default: null, trim: true, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type FormSubmission = InferSchemaType<typeof formSubmissionSchema>;
export type FormSubmissionDocument = HydratedDocument<FormSubmission>;
export const FormSubmissionModel = model<FormSubmission>('FormSubmission', formSubmissionSchema);
