import { Repo, IFileNode } from '../models/Repo.model';
import * as githubService from './github.service';
import * as groqService from './groq.service';
import { buildArchitecturePrompt, ARCHITECTURE_SYSTEM_PROMPT } from '../prompts/architecture.prompt';
import { Response } from 'express';

export interface ArchitectureAnalysis {
  summary: string;
  techStack: Array<{
    name: string;
    role: string;
    category: string;
  }>;
  architecturePattern: {
    name: string;
    description: string;
  };
  entryPoints: Array<{ path: string; description: string }>;
  keyDirectories: Array<{ path: string; purpose: string }>;
  dataFlow: string;
  gotchas: string[];
  setupSteps: string[];
  firstFilesToRead: Array<{ path: string; reason: string }>;
}

const prepareRepoContext = async (owner: string, name: string, fileTree: IFileNode[]) => {
  let packageJson: string | null = null;
  const pkgNode = fileTree.find(f => f.path === 'package.json');
  if (pkgNode) {
    try {
      packageJson = await githubService.getFileContent(owner, name, 'package.json');
    } catch {}
  }

  let readme: string | null = null;
  const readmeNode = fileTree.find(f =>
    ['README.md', 'readme.md', 'README.MD', 'README'].includes(f.path)
  );
  if (readmeNode) {
    try {
      readme = await githubService.getFileContent(owner, name, readmeNode.path);
    } catch {}
  }

  const NOISE_FILES = new Set([
    '.gitignore', '.eslintrc', '.prettierrc', 'LICENSE', 'CHANGELOG.md',
    '.env.example', '.nvmrc', '.node-version',
  ]);

  const topLevelItems = fileTree
    .filter(f => {
      const parts = f.path.split('/');
      return parts.length === 1 && !NOISE_FILES.has(f.path);
    })
    .map(f => `${f.type === 'tree' ? '📁' : '📄'} ${f.path}`)
    .join('\n');

  const ENTRY_POINT_NAMES = [
    'index.ts', 'index.js', 'main.ts', 'main.js',
    'app.ts', 'app.js', 'server.ts', 'server.js',
    'src/index.ts', 'src/index.js', 'src/main.ts', 'src/main.js',
    'src/app.ts', 'src/app.js',
    'cmd/main.go', 'main.go',
    'main.py', 'app.py', 'run.py',
    'Program.cs',
  ];

  const entryPoints = fileTree
    .filter(f => ENTRY_POINT_NAMES.includes(f.path))
    .map(f => f.path);

  const codeExtensions = new Set([
    'ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'cs', 'rb', 'php',
  ]);

  const codeFiles = fileTree.filter(f => {
    if (f.type !== 'blob') return false;
    const ext = f.path.split('.').pop()?.toLowerCase() ?? '';
    return codeExtensions.has(ext);
  });

  const sampleSize = 40;
  const step = Math.max(1, Math.floor(codeFiles.length / sampleSize));
  const sampleFilePaths = codeFiles
    .filter((_, idx) => idx % step === 0)
    .slice(0, sampleSize)
    .map(f => f.path);

  return {
    packageJson,
    readme,
    topLevelStructure: topLevelItems,
    entryPoints,
    sampleFilePaths,
    fileCount: fileTree.filter(f => f.type === 'blob').length,
  };
};

export const analyseArchitecture = async (
  owner: string,
  name: string,
  language: string,
  fileTree: IFileNode[]
): Promise<ArchitectureAnalysis> => {
  const context = await prepareRepoContext(owner, name, fileTree);

  const userPrompt = buildArchitecturePrompt({
    repoName: name,
    owner,
    language,
    ...context,
  });

  const messages = [
    { role: 'system' as const, content: ARCHITECTURE_SYSTEM_PROMPT },
    { role: 'user' as const, content: userPrompt },
  ];

  const raw = await groqService.complete(messages, {
    maxTokens: 3000,
    temperature: 0.1,
  });

  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned) as ArchitectureAnalysis;
  } catch {
    throw new Error(`Failed to parse architecture analysis JSON. Raw response: ${raw.slice(0, 200)}`);
  }
};

export const streamArchitectureAnalysis = async (
  owner: string,
  name: string,
  language: string,
  fileTree: IFileNode[],
  res: Response
): Promise<void> => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL || '*');

  res.flushHeaders();

  const sendEvent = (data: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    sendEvent({ type: 'status', message: 'Analysing repository structure...' });

    const context = await prepareRepoContext(owner, name, fileTree);
    const userPrompt = buildArchitecturePrompt({
      repoName: name,
      owner,
      language,
      ...context,
    });

    const messages = [
      { role: 'system' as const, content: ARCHITECTURE_SYSTEM_PROMPT },
      { role: 'user' as const, content: userPrompt },
    ];

    sendEvent({ type: 'status', message: 'Generating analysis...' });

    let fullContent = '';

    await groqService.streamComplete(messages, {
      maxTokens: 3000,
      temperature: 0.1,

      onToken: (token: string) => {
        fullContent += token;
        sendEvent({ type: 'token', content: token });
      },

      onDone: () => {
        try {
          const cleaned = fullContent
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```\s*$/i, '')
            .trim();

          const analysis = JSON.parse(cleaned) as ArchitectureAnalysis;
          sendEvent({ type: 'complete', analysis });
        } catch {
          sendEvent({ type: 'error', message: 'Failed to parse analysis. Try again.' });
        }

        res.write('data: [DONE]\n\n');
        res.end();
      },

      onError: (err: Error) => {
        sendEvent({ type: 'error', message: err.message });
        res.write('data: [DONE]\n\n');
        res.end();
      },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    sendEvent({ type: 'error', message });
    res.write('data: [DONE]\n\n');
    res.end();
  }
};