'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText } from 'lucide-react';
import { IFileNode } from '@/types';

interface FileTreeProps {
  fileTree: IFileNode[];
}


interface TreeNode {
  name: string;       
  path: string;      
  type: 'blob' | 'tree';
  size?: number;
  sha: string;
  children: TreeNode[];
}


const buildTree = (nodes: IFileNode[]): TreeNode[] => {
  const root: TreeNode[] = [];

  
  const sorted = [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'tree' ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  for (const node of sorted) {
    const parts = node.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isLast = i === parts.length - 1;

      
      let existing = current.find(n => n.name === name);

      if (!existing) {
        
        const newNode: TreeNode = {
          name,
          path: parts.slice(0, i + 1).join('/'),
          
          type: isLast ? node.type : 'tree',
          size: isLast ? node.size : undefined,
          sha: node.sha,
          children: [],
        };
        current.push(newNode);
        existing = newNode;
      }

      
      current = existing.children;
    }
  }

  return root;
};


const TreeNodeItem = ({
  node,
  depth,
  onFileClick,
}: {
  node: TreeNode;
  depth: number;
  onFileClick: (node: TreeNode) => void;
}) => {
  const [open, setOpen] = useState(depth === 0); 

  const isFolder = node.type === 'tree';

  return (
    <div>
      <button
        onClick={() => isFolder ? setOpen(o => !o) : onFileClick(node)}
        className="w-full flex items-center gap-1.5 px-2 py-1 text-sm
                   text-gray-300 hover:bg-gray-800 hover:text-white
                   rounded transition-colors duration-100 text-left"
        style={{ paddingLeft: `${8 + depth * 14}px` }} 
      >
        {/* Chevron for folders, empty space for files */}
        <span className="w-3.5 shrink-0">
          {isFolder && (open
            ? <ChevronDown size={12} />
            : <ChevronRight size={12} />
          )}
        </span>

        {/* Icon */}
        {isFolder
          ? open
            ? <FolderOpen size={14} className="text-blue-400 shrink-0" />
            : <Folder size={14} className="text-blue-400 shrink-0" />
          : <FileText size={14} className="text-gray-400 shrink-0" />
        }

        {/* File/folder name */}
        <span className="truncate">{node.name}</span>

        {/* File size for files */}
        {!isFolder && node.size !== undefined && (
          <span className="ml-auto text-xs text-gray-600 shrink-0">
            {formatBytes(node.size)}
          </span>
        )}
      </button>

      {/* Children — only rendered when folder is open */}
      {isFolder && open && node.children.map(child => (
        <TreeNodeItem
          key={child.path}
          node={child}
          depth={depth + 1}
          onFileClick={onFileClick}
        />
      ))}
    </div>
  );
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

export default function FileTree({ fileTree }: FileTreeProps) {
  
  const tree = useMemo(() => buildTree(fileTree), [fileTree]);

  const handleFileClick = () => {
    return;
  };

  return (
    <div className="py-2">
      <p className="text-xs font-medium text-gray-500 px-3 py-2 uppercase tracking-wider">
        Files
      </p>
      {tree.map(node => (
        <TreeNodeItem
          key={node.path}
          node={node}
          depth={0}
          onFileClick={handleFileClick}
        />
      ))}
    </div>
  );
}
