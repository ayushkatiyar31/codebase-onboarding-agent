export interface IFileNode {
  path: string;
  name?: string;
  type: 'blob' | 'tree' | 'file' | 'directory';
  children?: IFileNode[];
  size?: number;
  sha?: string;
  language?: string;
}
