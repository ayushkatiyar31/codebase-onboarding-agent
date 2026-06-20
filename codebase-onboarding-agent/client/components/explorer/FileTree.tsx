'use client';

import { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
} from 'lucide-react';
import { IFileNode } from '@/types';

interface FileTreeProps {
  fileTree: IFileNode[];
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
  onAskAboutFile?: (path: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children: TreeNode[];
}

const isDirectoryNode = (node: IFileNode): boolean => {
  return node.type === 'tree' || node.type === 'directory';
};

const buildTree = (nodes: IFileNode[]): TreeNode[] => {
  const root: TreeNode[] = [];

  const sorted = [...nodes].sort((a, b) => {
    if (isDirectoryNode(a) !== isDirectoryNode(b)) {
      return isDirectoryNode(a) ? -1 : 1;
    }
    return a.path.localeCompare(b.path);
  });

  for (const node of sorted) {
    const parts = node.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isLast = i === parts.length - 1;

      let existing = current.find((n) => n.name === name);

      if (!existing) {
        const newNode: TreeNode = {
          name,
          path: parts.slice(0, i + 1).join('/'),
          type:
            isLast && !isDirectoryNode(node)
              ? 'file'
              : 'directory',
          size: isLast ? node.size : undefined,
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
  selectedFile,
  onFileClick,
  onAskAboutFile,
}: {
  node: TreeNode;
  depth: number;
  selectedFile: string | null;
  onFileClick: (node: TreeNode) => void;
  onAskAboutFile?: (path: string) => void;
}) => {
  const [open, setOpen] = useState(depth === 0);

  const isFolder = node.type === 'directory';
  const isSelected = selectedFile === node.path;

  return (
    <div>
      <div
        className={`group w-full flex items-center gap-1.5 px-2 py-1 text-sm rounded transition-colors duration-100 ${
          isSelected
            ? 'bg-blue-600/20 text-blue-300'
            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        <button
          onClick={() =>
            isFolder ? setOpen((o) => !o) : onFileClick(node)
          }
          className="flex items-center gap-1.5 flex-1 text-left min-w-0"
        >
          <span className="w-3.5 shrink-0">
            {isFolder &&
              (open ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              ))}
          </span>

          {isFolder ? (
            open ? (
              <FolderOpen
                size={14}
                className="text-blue-400 shrink-0"
              />
            ) : (
              <Folder
                size={14}
                className="text-blue-400 shrink-0"
              />
            )
          ) : (
            <FileText
              size={14}
              className={`shrink-0 ${
                isSelected
                  ? 'text-blue-400'
                  : 'text-gray-400'
              }`}
            />
          )}

          <span className="truncate">{node.name}</span>
        </button>

        {!isFolder && onAskAboutFile && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAskAboutFile(node.path);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-300 hover:bg-blue-600/40 shrink-0"
            title={`Ask about ${node.name}`}
          >
            Ask
          </button>
        )}

        {!isFolder && node.size !== undefined && (
          <span className="ml-auto text-xs text-gray-600 shrink-0">
            {formatBytes(node.size)}
          </span>
        )}
      </div>

      {isFolder &&
        open &&
        node.children.map((child) => (
          <TreeNodeItem
            key={child.path}
            node={child}
            depth={depth + 1}
            selectedFile={selectedFile}
            onFileClick={onFileClick}
            onAskAboutFile={onAskAboutFile}
          />
        ))}
    </div>
  );
};

export default function FileTree({
  fileTree,
  selectedFile,
  onFileSelect,
  onAskAboutFile,
}: FileTreeProps) {
  const tree = useMemo(
    () => buildTree(fileTree),
    [fileTree]
  );

  return (
    <div className="py-2">
      <p className="text-xs font-medium text-gray-500 px-3 py-2 uppercase tracking-wider">
        Files
      </p>

      {tree.map((node) => (
        <TreeNodeItem
          key={node.path}
          node={node}
          depth={0}
          selectedFile={selectedFile}
          onFileClick={(node) => onFileSelect(node.path)}
          onAskAboutFile={onAskAboutFile}
        />
      ))}
    </div>
  );
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)}KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};