export interface Chunk {
  filePath: string;
  language: string;
  startLine: number;
  endLine: number;
  content: string;
  chunkType: ChunkType;
  name: string;
  tokenEstimate: number;
}

export type ChunkType =
  | 'function'
  | 'class'
  | 'import_block'
  | 'export'
  | 'component'
  | 'remainder';

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript',
  js: 'javascript', jsx: 'javascript',
  py: 'python',
  go: 'go',
  rs: 'rust',
  java: 'java',
  cpp: 'cpp', cc: 'cpp', cxx: 'cpp',
  c: 'c', h: 'c',
  cs: 'csharp',
  rb: 'ruby',
  php: 'php',
  swift: 'swift',
  kt: 'kotlin',
  md: 'markdown',
  json: 'json',
  yaml: 'yaml', yml: 'yaml',
  css: 'css', scss: 'css',
  html: 'html',
  sh: 'bash', bash: 'bash',
  sql: 'sql',
};

export const detectLanguage = (filePath: string): string => {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_TO_LANGUAGE[ext] ?? 'plaintext';
};

const SKIP_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp',
  'pdf', 'woff', 'woff2', 'ttf', 'eot',
  'zip', 'tar', 'gz', 'lock',
  'map',
]);

const SKIP_PATHS = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  '.gitignore', '.eslintignore',
]);

export const shouldSkipFile = (filePath: string): boolean => {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const filename = filePath.split('/').pop() ?? '';
  return SKIP_EXTENSIONS.has(ext) || SKIP_PATHS.has(filename);
};

interface PatternGroup {
  function: RegExp;
  class: RegExp;
  component: RegExp;
  import: RegExp;
}

const PATTERNS: Record<string, PatternGroup> = {
  typescript: {
    function: /^(?:export\s+)?(?:async\s+)?(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(|(?:public|private|protected|static|\s)+\w+\s*\()/,
    class: /^(?:export\s+)?(?:abstract\s+)?class\s+\w+/,
    component: /^(?:export\s+(?:default\s+)?)?(?:function\s+[A-Z]\w*|const\s+[A-Z]\w*\s*=\s*(?:\(|React\.memo))/,
    import: /^import\s+/,
  },
  javascript: {
    function: /^(?:export\s+)?(?:async\s+)?(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(|module\.exports\s*=)/,
    class: /^(?:export\s+)?class\s+\w+/,
    component: /^(?:export\s+(?:default\s+)?)?(?:function\s+[A-Z]\w*|const\s+[A-Z]\w*\s*=\s*(?:\(|React\.memo))/,
    import: /^(?:import\s+|const\s+\w+\s*=\s*require\()/,
  },
  python: {
    function: /^(?:async\s+)?def\s+\w+/,
    class: /^class\s+\w+/,
    component: /^(?:async\s+)?def\s+[A-Z]\w+/,
    import: /^(?:import\s+|from\s+\w+\s+import)/,
  },
  go: {
    function: /^func\s+(?:\(\w+\s+\*?\w+\)\s+)?\w+\s*\(/,
    class: /^type\s+\w+\s+struct/,
    component: /^func\s+[A-Z]\w*\s*\(/,
    import: /^import\s+(?:\(|")/,
  },
};

const DEFAULT_PATTERNS: PatternGroup = {
  function: /^(?:function|def|func|sub|procedure)\s+\w+/i,
  class: /^(?:class|struct|interface|type)\s+\w+/i,
  component: /^(?:function|const)\s+[A-Z]\w*/,
  import: /^(?:import|require|include|use)\s+/i,
};

const getPatternsForLanguage = (language: string): PatternGroup => {
  return PATTERNS[language] ?? DEFAULT_PATTERNS;
};

const MAX_CHUNK_LINES = 150;
const MIN_CHUNK_LINES = 3;

export const chunkFile = (
  content: string,
  filePath: string,
): Chunk[] => {
  const language = detectLanguage(filePath);
  const lines = content.split('\n');

  if (lines.length < MIN_CHUNK_LINES) {
    return [{
      filePath,
      language,
      startLine: 1,
      endLine: lines.length,
      content,
      chunkType: 'remainder',
      name: filePath.split('/').pop() ?? filePath,
      tokenEstimate: Math.ceil(content.length / 4),
    }];
  }

  const patterns = getPatternsForLanguage(language);
  const chunks: Chunk[] = [];

  let importEnd = 0;
  const importLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (
      patterns.import.test(trimmed) ||
      (
        trimmed === '' &&
        importLines.length > 0 &&
        i + 1 < lines.length &&
        patterns.import.test(lines[i + 1]?.trim() ?? '')
      )
    ) {
      importLines.push(lines[i]);
      importEnd = i;
    } else if (importLines.length > 0 && trimmed !== '') {
      break;
    }
  }

  if (importLines.length > 0) {
    const importContent = importLines.join('\n');

    chunks.push({
      filePath,
      language,
      startLine: 1,
      endLine: importEnd + 1,
      content: importContent,
      chunkType: 'import_block',
      name: 'imports',
      tokenEstimate: Math.ceil(importContent.length / 4),
    });
  }

  interface Boundary {
    lineIndex: number;
    type: ChunkType;
    name: string;
  }

  const boundaries: Boundary[] = [];

  for (let i = importEnd + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (
      trimmed === '' ||
      trimmed.startsWith('//') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('#')
    ) {
      continue;
    }

    if (patterns.component.test(trimmed)) {
      const name = extractName(trimmed, 'component');
      boundaries.push({ lineIndex: i, type: 'component', name });
    } else if (patterns.class.test(trimmed)) {
      const name = extractName(trimmed, 'class');
      boundaries.push({ lineIndex: i, type: 'class', name });
    } else if (patterns.function.test(trimmed)) {
      const name = extractName(trimmed, 'function');
      boundaries.push({ lineIndex: i, type: 'function', name });
    }
  }

  for (let b = 0; b < boundaries.length; b++) {
    const boundary = boundaries[b];
    const startLineIndex = boundary.lineIndex;

    const endLineIndex = b + 1 < boundaries.length
      ? boundaries[b + 1].lineIndex - 1
      : lines.length - 1;

    const chunkLines = lines.slice(startLineIndex, endLineIndex + 1);
    const chunkContent = chunkLines.join('\n');

    if (chunkLines.length < MIN_CHUNK_LINES) continue;

    if (chunkLines.length > MAX_CHUNK_LINES) {
      const subChunks = splitLargeChunk(
        chunkContent,
        filePath,
        language,
        startLineIndex,
        boundary.type,
        boundary.name,
      );

      chunks.push(...subChunks);
    } else {
      chunks.push({
        filePath,
        language,
        startLine: startLineIndex + 1,
        endLine: endLineIndex + 1,
        content: chunkContent,
        chunkType: boundary.type,
        name: boundary.name,
        tokenEstimate: Math.ceil(chunkContent.length / 4),
      });
    }
  }

  if (boundaries.length > 0) {
    const firstBoundary = boundaries[0].lineIndex;

    if (firstBoundary > importEnd + 2) {
      const remainderLines = lines.slice(importEnd + 1, firstBoundary);
      const remainderContent = remainderLines.join('\n').trim();

      if (remainderContent.length > 0) {
        chunks.push({
          filePath,
          language,
          startLine: importEnd + 2,
          endLine: firstBoundary,
          content: remainderContent,
          chunkType: 'remainder',
          name: 'module-level code',
          tokenEstimate: Math.ceil(remainderContent.length / 4),
        });
      }
    }
  } else if (importEnd < lines.length - 1) {
    const restContent = lines.slice(importEnd + 1).join('\n').trim();

    if (
      restContent.length > 0 &&
      restContent.split('\n').length >= MIN_CHUNK_LINES
    ) {
      chunks.push({
        filePath,
        language,
        startLine: importEnd + 2,
        endLine: lines.length,
        content: restContent,
        chunkType: 'remainder',
        name: filePath.split('/').pop() ?? filePath,
        tokenEstimate: Math.ceil(restContent.length / 4),
      });
    }
  }

  return chunks.sort((a, b) => a.startLine - b.startLine);
};

const extractName = (
  line: string,
  type: ChunkType,
): string => {
  const constMatch = line.match(/const\s+(\w+)\s*=/);
  if (constMatch) return constMatch[1];

  const funcMatch = line.match(/function\s+(\w+)/);
  if (funcMatch) return funcMatch[1];

  const classMatch = line.match(/class\s+(\w+)/);
  if (classMatch) return classMatch[1];

  const goMethodMatch = line.match(
    /func\s+\(\w+\s+\*?\w+\)\s+(\w+)/
  );
  if (goMethodMatch) return goMethodMatch[1];

  const goFuncMatch = line.match(/func\s+(\w+)/);
  if (goFuncMatch) return goFuncMatch[1];

  const pyMatch = line.match(/def\s+(\w+)/);
  if (pyMatch) return pyMatch[1];

  return type;
};

const splitLargeChunk = (
  content: string,
  filePath: string,
  language: string,
  startLineOffset: number,
  type: ChunkType,
  name: string,
): Chunk[] => {
  const lines = content.split('\n');
  const subChunks: Chunk[] = [];

  let subStart = 0;
  let subIndex = 1;

  for (
    let i = MAX_CHUNK_LINES;
    i < lines.length;
    i += MAX_CHUNK_LINES
  ) {
    let cutPoint = i;

    for (
      let j = i;
      j > Math.max(i - 20, subStart);
      j--
    ) {
      if (lines[j].trim() === '') {
        cutPoint = j;
        break;
      }
    }

    const subContent = lines
      .slice(subStart, cutPoint)
      .join('\n');

    if (subContent.trim().length > 0) {
      subChunks.push({
        filePath,
        language,
        startLine: startLineOffset + subStart + 1,
        endLine: startLineOffset + cutPoint + 1,
        content: subContent,
        chunkType: type,
        name: `${name} (part ${subIndex})`,
        tokenEstimate: Math.ceil(subContent.length / 4),
      });

      subIndex++;
    }

    subStart = cutPoint + 1;
  }

  if (subStart < lines.length) {
    const tailContent = lines
      .slice(subStart)
      .join('\n');

    if (tailContent.trim().length > 0) {
      subChunks.push({
        filePath,
        language,
        startLine: startLineOffset + subStart + 1,
        endLine: startLineOffset + lines.length,
        content: tailContent,
        chunkType: type,
        name: `${name} (part ${subIndex})`,
        tokenEstimate: Math.ceil(tailContent.length / 4),
      });
    }
  }

  return subChunks;
};