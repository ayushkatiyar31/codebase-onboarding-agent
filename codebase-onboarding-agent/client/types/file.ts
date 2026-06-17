export interface IFileNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  children?: IFileNode[];
  size?: number;
  language?: string;
}
