import mongoose, { Document, Schema } from 'mongoose';
import { DependencyEdge, GraphStats } from '../services/dependencyParser.service';

export interface IGraph extends Document {
  repoId: mongoose.Types.ObjectId;
  edges: DependencyEdge[];
  stats: GraphStats;
  generatedAt: Date;
}

const EdgeSchema = new Schema<DependencyEdge>({
  source: { type: String, required: true },
  target: { type: String, required: true },
  importedNames: { type: [String], default: [] },
}, { _id: false });

const GraphSchema = new Schema<IGraph>({
  repoId: { type: Schema.Types.ObjectId, ref: 'Repo', required: true, unique: true },
  edges: { type: [EdgeSchema], default: [] },
  stats: { type: Schema.Types.Mixed, default: {} },
  generatedAt: { type: Date, default: Date.now },
});

export const Graph = mongoose.model<IGraph>('Graph', GraphSchema, 'graphs');