
import mongoose, { Document, Schema } from 'mongoose';

export interface IChunk extends Document {
  repoId: mongoose.Types.ObjectId;
  filePath: string;
  language: string;
  startLine: number;
  endLine: number;
  content: string;
  chunkType: string;
  name: string;
  tokenEstimate: number;
}

const ChunkSchema = new Schema<IChunk>({
  repoId:        { type: Schema.Types.ObjectId, ref: 'Repo', required: true, index: true },
  filePath:      { type: String, required: true },
  language:      { type: String, required: true },
  startLine:     { type: Number, required: true },
  endLine:       { type: Number, required: true },
  content:       { type: String, required: true },
  chunkType:     { type: String, required: true },
  name:          { type: String, required: true },
  tokenEstimate: { type: Number, required: true },
}, {
  timestamps: true,
});

ChunkSchema.index({ repoId: 1, filePath: 1 });

export const Chunk = mongoose.model<IChunk>('Chunk', ChunkSchema, 'chunks');