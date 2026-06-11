import mongoose, { Document, Schema } from 'mongoose';


export interface IRepo extends Document {
  owner: string;        
  name: string;           
  fullName: string;        
  description: string;
  defaultBranch: string;   
  language: string;        
  stars: number;
  fileTree: IFileNode[];  
  status: 'pending' | 'processing' | 'ready' | 'error';
  createdAt: Date;
  updatedAt: Date;
}


export interface IFileNode {
  path: string;
  type: 'blob' | 'tree'; 
  size?: number;      
  sha: string;        
}

const FileNodeSchema = new Schema<IFileNode>({
  path:  { type: String, required: true },
  type:  { type: String, enum: ['blob', 'tree'], required: true },
  size:  { type: Number },
  sha:   { type: String, required: true },
}, { _id: false }); 


const RepoSchema = new Schema<IRepo>({
  owner:         { type: String, required: true },
  name:          { type: String, required: true },
  fullName:      { type: String, required: true, unique: true }, 
  description:   { type: String, default: '' },
  defaultBranch: { type: String, default: 'main' },
  language:      { type: String, default: 'Unknown' },
  stars:         { type: Number, default: 0 },
  fileTree:      { type: [FileNodeSchema], default: [] },
  status:        { type: String, enum: ['pending', 'processing', 'ready', 'error'], default: 'pending' },
}, {
  timestamps: true, 
});


export const Repo = mongoose.model<IRepo>('Repo', RepoSchema, 'repos');