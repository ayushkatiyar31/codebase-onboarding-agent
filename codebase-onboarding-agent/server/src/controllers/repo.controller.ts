import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { IFileNode, Repo } from '../models/Repo.model';
import * as githubService from '../services/github.service';
import { shouldSkipFile } from '../services/chunker.service';
import { createChunksForRepo } from '../services/repoIndexing.service';

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


const triggerChunkingInBackground = async (
  repoId: string,
  owner: string,
  name: string,
  fileTree: IFileNode[]
) => {
  try {
    await createChunksForRepo({
      _id: new mongoose.Types.ObjectId(repoId),
      owner,
      name,
      fileTree,
    });

    console.log(`Background chunking complete for ${owner}/${name}`);

    const { generateEmbeddingsForRepo } = await import(
      '../services/vectorSearch.service'
    );

    await generateEmbeddingsForRepo(repoId);

    console.log(`Background embedding complete for ${owner}/${name}`);

  } catch (error) {
    console.error(
  `Background processing failed for ${owner}/${name}:`,
  error
);
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

    const result = await createChunksForRepo(repo);

    await Repo.findByIdAndUpdate(repo._id, { status: 'ready' });

    res.json({
      message: 'Chunking complete',
      totalChunks: result.totalChunks,
      filesProcessed: result.filesProcessed,
      errors: result.errors.length > 0 ? result.errors.slice(0, 5) : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
};
