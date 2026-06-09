import { Request, Response } from 'express';
import { Repo } from '../models/Repo.model';
import * as githubService from '../services/github.service';
import * as geminiService from '../services/gemini.service';
import {
  ARCHITECTURE_SYSTEM_PROMPT,
  buildArchitecturePrompt,
} from '../prompts/architecture.prompt';

const MANIFEST_FILES = [
  'package.json', 'requirements.txt', 'go.mod', 'Cargo.toml',
  'pom.xml', 'build.gradle', 'composer.json', 'Gemfile',
];

const README_PATTERNS = ['README.md', 'readme.md', 'README', 'README.rst'];

const ENTRY_POINT_PATTERNS = [
  'src/index.ts', 'src/index.js', 'src/main.ts', 'src/main.js',
  'src/app.ts', 'src/app.js', 'index.ts', 'index.js',
  'main.ts', 'main.js', 'app.ts', 'app.js',
  'server.ts', 'server.js', 'cmd/main.go', 'main.go',
  'main.py', 'app.py', '__init__.py',
];

const findFileInTree = (
  filePaths: string[],
  candidates: string[]
): string | null => {
  for (const candidate of candidates) {
    if (filePaths.includes(candidate)) return candidate;
  }
  return null;
};

export const analyseArchitecture = async (req: Request, res: Response): Promise<void> => {
  try {
    const { owner, name } = req.params as { owner: string; name: string };

    const repo = await Repo.findOne({ fullName: `${owner}/${name}` });
    if (!repo) {
      res.status(404).json({ error: 'Repo not found. Ingest it first.' });
      return;
    }

    const filePaths = repo.fileTree
      .filter(n => n.type === 'blob')
      .map(n => n.path);

    const manifestFile = findFileInTree(filePaths, MANIFEST_FILES);
    let packageJson: string | null = null;
    if (manifestFile) {
      try {
        packageJson = await githubService.getFileContent(owner, name, manifestFile);
      } catch {
        console.warn(`Could not fetch ${manifestFile}`);
      }
    }

    const readmeFile = findFileInTree(filePaths, README_PATTERNS);
    let readme: string | null = null;
    if (readmeFile) {
      try {
        readme = await githubService.getFileContent(owner, name, readmeFile);
      } catch {
        console.warn(`Could not fetch ${readmeFile}`);
      }
    }

    const entryFileContents: Array<{ path: string; content: string }> = [];
    for (const candidate of ENTRY_POINT_PATTERNS) {
      if (entryFileContents.length >= 3) break;
      if (filePaths.includes(candidate)) {
        try {
          const content = await githubService.getFileContent(owner, name, candidate);
          entryFileContents.push({ path: candidate, content });
        } catch {
        }
      }
    }

    const userPrompt = buildArchitecturePrompt({
      owner,
      repoName: name,
      language: repo.language,
      fileTree: filePaths,
      packageJson,
      readme,
      entryFileContents,
    });

    const analysis = await geminiService.generateJSON(
      ARCHITECTURE_SYSTEM_PROMPT,
      userPrompt,
    );

    res.json({ analysis });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('analyseArchitecture error:', message);
    res.status(500).json({ error: message });
  }
};

export const streamArchitectureExplanation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { owner, name } = req.params as { owner: string; name: string };

    const repo = await Repo.findOne({ fullName: `${owner}/${name}` });
    if (!repo) {
      res.status(404).json({ error: 'Repo not found.' });
      return;
    }

    const filePaths = repo.fileTree
      .filter(n => n.type === 'blob')
      .map(n => n.path);

    const manifestFile = findFileInTree(filePaths, MANIFEST_FILES);
    let packageJson: string | null = null;
    if (manifestFile) {
      try { packageJson = await githubService.getFileContent(owner, name, manifestFile); }
      catch { }
    }

    const STREAM_SYSTEM = `You are a senior engineer explaining a codebase to a new team member.
Write in clear, friendly Markdown. Use headings (##), bullet points, and inline code where helpful.
Be specific — reference real file paths and function names from the provided context.
Do not pad or repeat yourself. Aim for ~400 words.`;

    const userPrompt = `
Explain the architecture of ${owner}/${name} to a developer joining the team today.

Primary language: ${repo.language}
File tree (sample): ${filePaths.slice(0, 100).join('\n')}
${packageJson ? `\npackage.json:\n${packageJson.slice(0, 1500)}` : ''}

Cover: what it does, how it is structured, how data flows, and 2-3 things to know before contributing.
`.trim();

    await geminiService.streamToResponse(STREAM_SYSTEM, userPrompt, res);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  }
};