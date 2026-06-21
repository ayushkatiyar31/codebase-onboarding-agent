export interface RawImport {
  sourceFile: string;
  importPath: string;
  importedNames: string[];
  isExternal: boolean;
}

export interface DependencyEdge {
  source: string;
  target: string;
  importedNames: string[];
}

const IMPORT_PATTERNS: Record<string, RegExp[]> = {
  typescript: [
    /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g,
    /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
    /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
  ],
  javascript: [
    /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g,
    /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
    /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
    /const\s+\{([^}]+)\}\s*=\s*require\(['"]([^'"]+)['"]\)/g,
    /const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g,
  ],
  python: [
    /from\s+(\.[\w.]*)\s+import\s+([\w,\s]+)/g,
    /^import\s+(\.[\w.]+)/gm,
  ],
  go: [
    /^\s*"([^"]+)"/gm,
  ],
};

export const extractImports = (content: string, filePath: string, language: string): RawImport[] => {
  const patterns = IMPORT_PATTERNS[language];
  if (!patterns) return [];

  const imports: RawImport[] = [];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(content)) !== null) {
      const result = parseMatch(match, language);
      if (result) {
        imports.push({
          sourceFile: filePath,
          importPath: result.importPath,
          importedNames: result.importedNames,
          isExternal: isExternalImport(result.importPath),
        });
      }
    }
  }

  return imports;
};

const parseMatch = (
  match: RegExpExecArray,
  language: string
): { importPath: string; importedNames: string[] } | null => {

  if (language === 'go') {
    return { importPath: match[1], importedNames: [] };
  }

  if (language === 'python') {
    if (match[2]) {
      const names = match[2].split(',').map(n => n.trim()).filter(Boolean);
      return { importPath: match[1], importedNames: names };
    }

    return { importPath: match[1], importedNames: [] };
  }

  if (match.length >= 3 && match[2]) {
    const namesRaw = match[1];
    const importPath = match[2];

    const names = namesRaw.includes(',') || namesRaw.includes('{')
      ? namesRaw.split(',').map(n => n.trim().split(' as ').pop()?.trim() ?? '').filter(Boolean)
      : [namesRaw.trim()];

    return { importPath, importedNames: names };
  }

  if (match.length >= 2 && match[1] && !match[2]) {
    return { importPath: match[1], importedNames: [] };
  }

  return null;
};

const isExternalImport = (importPath: string): boolean => {
  return !importPath.startsWith('.') && !importPath.startsWith('/');
};

export const resolveImportPath = (
  importPath: string,
  sourceFilePath: string,
  allFilePaths: Set<string>
): string | null => {

  if (isExternalImport(importPath)) return null;

  const sourceDir = sourceFilePath.includes('/')
    ? sourceFilePath.slice(0, sourceFilePath.lastIndexOf('/'))
    : '';

  const resolvedBase = resolvePath(sourceDir, importPath);

  const candidates = [
    resolvedBase,
    `${resolvedBase}.ts`,
    `${resolvedBase}.tsx`,
    `${resolvedBase}.js`,
    `${resolvedBase}.jsx`,
    `${resolvedBase}.py`,
    `${resolvedBase}.go`,
    `${resolvedBase}/index.ts`,
    `${resolvedBase}/index.tsx`,
    `${resolvedBase}/index.js`,
    `${resolvedBase}/__init__.py`,
  ];

  for (const candidate of candidates) {
    if (allFilePaths.has(candidate)) return candidate;
  }

  return null;
};

const resolvePath = (baseDir: string, relativePath: string): string => {
  const baseParts = baseDir.split('/').filter(Boolean);
  const relativeParts = relativePath.split('/').filter(Boolean);

  for (const part of relativeParts) {
    if (part === '.') continue;
    else if (part === '..') baseParts.pop();
    else baseParts.push(part);
  }

  return baseParts.join('/');
};

export const buildDependencyGraph = (
  fileContents: Map<string, { content: string; language: string }>,
): DependencyEdge[] => {

  const allFilePaths = new Set(fileContents.keys());
  const edges: DependencyEdge[] = [];

  const edgeMap = new Map<string, DependencyEdge>();

  for (const [filePath, { content, language }] of fileContents) {
    const rawImports = extractImports(content, filePath, language);

    for (const rawImport of rawImports) {
      if (rawImport.isExternal) continue;

      const resolved = resolveImportPath(rawImport.importPath, filePath, allFilePaths);
      if (!resolved || resolved === filePath) continue;

      const edgeKey = `${filePath}→${resolved}`;

      if (edgeMap.has(edgeKey)) {
        const existing = edgeMap.get(edgeKey)!;
        const merged = new Set([...existing.importedNames, ...rawImport.importedNames]);
        existing.importedNames = Array.from(merged);
      } else {
        edgeMap.set(edgeKey, {
          source: filePath,
          target: resolved,
          importedNames: rawImport.importedNames,
        });
      }
    }
  }

  return Array.from(edgeMap.values());
};

export interface GraphStats {
  entryPoints: string[];
  mostImported: Array<{ filePath: string; importedByCount: number }>;
  leafNodes: string[];
}

export const computeGraphStats = (edges: DependencyEdge[], allFiles: string[]): GraphStats => {
  const importedByCount = new Map<string, number>();
  const importsCount = new Map<string, number>();

  for (const file of allFiles) {
    importedByCount.set(file, 0);
    importsCount.set(file, 0);
  }

  for (const edge of edges) {
    importsCount.set(edge.source, (importsCount.get(edge.source) ?? 0) + 1);
    importedByCount.set(edge.target, (importedByCount.get(edge.target) ?? 0) + 1);
  }

  const entryPoints = allFiles.filter(f => (importedByCount.get(f) ?? 0) === 0);

  const leafNodes = allFiles.filter(f => (importsCount.get(f) ?? 0) === 0);

  const mostImported = Array.from(importedByCount.entries())
    .map(([filePath, count]) => ({ filePath, importedByCount: count }))
    .filter(item => item.importedByCount > 0)
    .sort((a, b) => b.importedByCount - a.importedByCount)
    .slice(0, 10);

  return { entryPoints, mostImported, leafNodes };
};