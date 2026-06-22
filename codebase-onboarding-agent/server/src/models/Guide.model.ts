import mongoose, { Document, Schema } from 'mongoose';

export interface IGuide extends Document {
  repoId: mongoose.Types.ObjectId;
  repoFullName: string;
  shareId: string;
  markdown: string;
  generatedAt: Date;
}

const GuideSchema = new Schema<IGuide>({
  repoId: { type: Schema.Types.ObjectId, ref: 'Repo', required: true },
  repoFullName: { type: String, required: true },
  shareId: { type: String, required: true, unique: true, index: true },
  markdown: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },
});

export const Guide = mongoose.model<IGuide>('Guide', GuideSchema, 'guides');