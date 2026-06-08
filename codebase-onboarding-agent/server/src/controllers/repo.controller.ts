import { Request, Response } from 'express';
import { Chunk } from '../models/Chunk.model';
import { IFileNode, Repo } from '../models/Repo.model';
import * as githubService from '../services/github.service';
import { chunkFile, shouldSkipFile } from '../services/chunker.service';

const parseGitHubUrl = (url: string): { owner: string; name: string } | null => {
  try {
    const parsed = new URL(url);

    if (parsed.hostname !== 'github.com') return null;

    const parts = parsed.pathname.replace(/\/$/, '').split('/').filter(Boolean);

    if (parts.length < 2) return null;

    return { owner: parts[0], name: parts[1] };
  } catch {
    return null;
  }
};

// Runs chunking without blocking the HTTP response
// Errors here are logged but don't affect the user
const triggerChunkingInBackground = async (
  repoId: string,
  owner: string,
  name: string,
  fileTree: IFileNode[]
) => {
  try {
    const filesToProcess = fileTree.filter(
      node => node.type === 'blob' && !shouldSkipFile(node.path)
    );

    await Chunk.deleteMany({ repoId });

    const BATCH_SIZE = 10;
    for (let i = 0; i < filesToProcess.length; i += BATCH_SIZE) {
      const batch = filesToProcess.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (file) => {
          const content = await githubService.getFileContent(owner, name, file.path);
          const chunks = chunkFile(content, file.path);
          if (chunks.length > 0) {
            await Chunk.insertMany(chunks.map(chunk => ({ ...chunk, repoId })));
          }
        })
      );

      if (i + BATCH_SIZE < filesToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`Background chunking complete for ${owner}/${name}`);
  } catch (error) {
    console.error(`Background chunking failed for ${owner}/${name}:`, error);
  }
};

export const ingestRepo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { repoUrl } = req.body as { repoUrl: string };

    if (!repoUrl) {
      res.status(400).json({ error: 'repoUrl is required' });
      return;
    }

    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      res.status(400).json({ error: 'Invalid GitHub URL. Expected format: https://github.com/owner/repo' });
      return;
    }

    const { owner, name } = parsed;

    const existing = await Repo.findOne({ fullName: `${owner}/${name}` });
    if (existing && existing.status === 'ready') {
      res.json({ message: 'Repo already ingested', repo: existing });
      return;
    }

    const repoInfo = await githubService.getRepoInfo(owner, name);
    const fileTree = await githubService.getRepoFileTree(owner, name, repoInfo.default_branch);

    const repo = await Repo.findOneAndUpdate(
      { fullName: `${owner}/${name}` },
      {
        owner,
        name,
        fullName: `${owner}/${name}`,
        description: repoInfo.description || '',
        defaultBranch: repoInfo.default_branch,
        language: repoInfo.language || 'Unknown',
        stars: repoInfo.stargazers_count,
        fileTree,
        status: 'ready',
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    // After saving to MongoDB, kick off chunking in the background
    // We do NOT await this - we return the response immediately and chunk asynchronously
    // This way the user gets a fast response and chunking happens behind the scenes
    triggerChunkingInBackground(repo._id.toString(), owner, name, repo.fileTree);

    res.status(201).json({
      message: 'Repo ingested - chunking in progress in background',
      repo: {
        id: repo._id,
        owner: repo.owner,
        name: repo.name,
        fullName: repo.fullName,
        description: repo.description,
        language: repo.language,
        stars: repo.stars,
        defaultBranch: repo.defaultBranch,
        fileCount: fileTree.filter(f => f.type === 'blob').length,
        status: repo.status,
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('ingestRepo error:', message);
    res.status(500).json({ error: message });
  }
};

export const getRepo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { owner, name } = req.params;

    const repo = await Repo.findOne({ fullName: `${owner}/${name}` });

    if (!repo) {
      res.status(404).json({ error: 'Repo not found. Ingest it first via POST /api/repo/ingest' });
      return;
    }

    res.json({ repo });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
};

export const getFileContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const owner = Array.isArray(req.params.owner) ? req.params.owner[0] : req.params.owner;
    const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
    const filePath = req.query.path as string;

    if (!filePath) {
      res.status(400).json({ error: 'Query param "path" is required' });
      return;
    }

    if (shouldSkipFile(filePath)) {
      res.status(400).json({ error: 'Binary or generated file cannot display' });
      return;
    }

    const content = await githubService.getFileContent(owner, name, filePath);
    res.json({ content, filePath });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
};

export const chunkRepo = async (req: Request, res: Response): Promise<void> => {
  try {
    const owner = Array.isArray(req.params.owner) ? req.params.owner[0] : req.params.owner;
    const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;

    const repo = await Repo.findOne({ fullName: `${owner}/${name}` });
    if (!repo) {
      res.status(404).json({ error: 'Repo not found. Ingest it first.' });
      return;
    }

    await Chunk.deleteMany({ repoId: repo._id });

    const filesToProcess = repo.fileTree.filter(
      node => node.type === 'blob' && !shouldSkipFile(node.path)
    );

    console.log(`Chunking ${filesToProcess.length} files for ${owner}/${name}...`);

    let totalChunks = 0;
    const errors: string[] = [];

    const BATCH_SIZE = 10;

    for (let i = 0; i < filesToProcess.length; i += BATCH_SIZE) {
      const batch = filesToProcess.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (file) => {
          const content = await githubService.getFileContent(owner, name, file.path);
          const chunks = chunkFile(content, file.path);

          if (chunks.length > 0) {
            await Chunk.insertMany(
              chunks.map(chunk => ({ ...chunk, repoId: repo._id }))
            );
          }

          return chunks.length;
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          totalChunks += result.value;
        } else {
          errors.push(result.reason instanceof Error ? result.reason.message : 'Unknown error');
        }
      }

      if (i + BATCH_SIZE < filesToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    await Repo.findByIdAndUpdate(repo._id, { status: 'ready' });

    res.json({
      message: 'Chunking complete',
      totalChunks,
      filesProcessed: filesToProcess.length - errors.length,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
};
