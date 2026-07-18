'use client';
import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText } from 'lucide-react';
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
                    type: isLast && !isDirectoryNode(node) ? 'file' : 'directory',
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

const TreeNodeItem = ({ node, depth, selectedFile, onFileClick, onAskAboutFile }: {
    node: TreeNode;
    depth: number;
    selectedFile: string | null;
    onFileClick: (node: TreeNode) => void;
    onAskAboutFile?: (path: string) => void;
}) => {
    const [open, setOpen] = useState(depth === 0);
    const isFolder = node.type === 'directory';
    const isSelected = selectedFile === node.path;
    const indent = 8 + depth * 14;

    return (
        <div>
            <div
                onClick={() => (isFolder ? setOpen((o) => !o) : onFileClick(node))}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    margin: '2px 8px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    paddingLeft: `${indent}px`,
                    background: isSelected ? 'linear-gradient(90deg, rgba(99,102,241,0.24), rgba(129,140,248,0.12))' : 'transparent',
                    border: isSelected ? '1px solid rgba(129,140,248,0.24)' : '1px solid transparent',
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 8px 20px rgba(15, 23, 42, 0.18)' : 'none',
                }}
            >
                <span style={{ width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isFolder && (open ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
                </span>

                {isFolder ? (
                    open ? <FolderOpen size={14} style={{ color: 'var(--accent-light)', flexShrink: 0 }} /> : <Folder size={14} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
                ) : (
                    <FileText size={14} style={{ color: isSelected ? 'var(--accent-light)' : 'var(--text-tertiary)', flexShrink: 0 }} />
                )}

                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                    {node.name}
                </span>

                {!isFolder && onAskAboutFile && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onAskAboutFile(node.path);
                        }}
                        style={{
                            opacity: 0.9,
                            border: '1px solid rgba(129,140,248,0.16)',
                            background: 'rgba(99,102,241,0.14)',
                            color: 'var(--accent-light)',
                            borderRadius: 999,
                            padding: '3px 8px',
                            fontSize: 10,
                            cursor: 'pointer',
                            flexShrink: 0,
                        }}
                        title={`Ask about ${node.name}`}
                    >
                        Ask
                    </button>
                )}

                {!isFolder && node.size !== undefined && (
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                        {formatBytes(node.size)}
                    </span>
                )}
            </div>

            {isFolder && open && node.children.map((child) => (
                <TreeNodeItem key={child.path} node={child} depth={depth + 1} selectedFile={selectedFile} onFileClick={onFileClick} onAskAboutFile={onAskAboutFile} />
            ))}
        </div>
    );
};

export default function FileTree({ fileTree, selectedFile, onFileSelect, onAskAboutFile }: FileTreeProps) {
    const tree = useMemo(() => buildTree(fileTree), [fileTree]);
    return (
        <div style={{ padding: '10px 0 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px 8px' }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                    Files
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{tree.length} roots</span>
            </div>
            {tree.map((node) => (
                <TreeNodeItem key={node.path} node={node} depth={0} selectedFile={selectedFile} onFileClick={(node) => onFileSelect(node.path)} onAskAboutFile={onAskAboutFile} />
            ))}
        </div>
    );
}

const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};
