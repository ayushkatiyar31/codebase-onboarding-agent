import mongoose, { Document, Schema } from 'mongoose';

// Interface: TypeScript type for a Repo document
// Document is a Mongoose type that adds .save(), .id, etc.
export interface IRepo extends Document {
  owner: string;           // GitHub username or org, e.g. "expressjs"
  name: string;            // Repo name, e.g. "express"
  fullName: string;        // "expressjs/express" — used as a unique identifier
  description: string;
  defaultBranch: string;   // usually "main" or "master"
  language: string;        // primary language detected by GitHub
  stars: number;
  fileTree: IFileNode[];   // the full file/folder tree (see below)
  status: 'pending' | 'processing' | 'ready' | 'error';
  createdAt: Date;
  updatedAt: Date;
}

// Represents a single file or folder in the repo tree
export interface IFileNode {
  path: string;       // e.g. "src/routes/repo.routes.ts"
  type: 'blob' | 'tree'; // blob = file, tree = folder (GitHub's naming)
  size?: number;      // file size in bytes (undefined for folders)
  sha: string;        // Git's unique hash for this file's content
}

// The actual Mongoose schema — maps 1:1 with the interface above
const FileNodeSchema = new Schema<IFileNode>({
  path:  { type: String, required: true },
  type:  { type: String, enum: ['blob', 'tree'], required: true },
  size:  { type: Number },
  sha:   { type: String, required: true },
}, { _id: false }); // _id: false — these are sub-documents, they don't need their own Mongo ID


const RepoSchema = new Schema<IRepo>({
  owner:         { type: String, required: true },
  name:          { type: String, required: true },
  fullName:      { type: String, required: true, unique: true }, // unique: no two docs with same fullName
  description:   { type: String, default: '' },
  defaultBranch: { type: String, default: 'main' },
  language:      { type: String, default: 'Unknown' },
  stars:         { type: Number, default: 0 },
  fileTree:      { type: [FileNodeSchema], default: [] },
  status:        { type: String, enum: ['pending', 'processing', 'ready', 'error'], default: 'pending' },
}, {
  timestamps: true, // auto-adds createdAt and updatedAt fields, managed by Mongoose
});

// The third argument 'repos' is the collection name in MongoDB
// Without it, Mongoose would use 'repoes' (auto-plural) which looks wrong
export const Repo = mongoose.model<IRepo>('Repo', RepoSchema, 'repos');