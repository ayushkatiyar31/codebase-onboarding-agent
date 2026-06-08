// types/index.ts
// Shared TypeScript types used across the frontend

export interface IFileNode {
  path: string;
  type: 'blob' | 'tree';
  size?: number;
  sha: string;
}