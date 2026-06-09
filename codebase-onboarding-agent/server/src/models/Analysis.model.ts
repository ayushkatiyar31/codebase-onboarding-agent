import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalysis extends Document {
  repoId: mongoose.Types.ObjectId;
  analysis: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AnalysisSchema = new Schema<IAnalysis>({
  repoId: { type: Schema.Types.ObjectId, ref: 'Repo', required: true, unique: true },
  analysis: { type: Schema.Types.Mixed, required: true },
}, {
  timestamps: true,
});

export const Analysis = mongoose.model<IAnalysis>('Analysis', AnalysisSchema, 'analyses');