import { Request, Response } from 'express';
import { Repo } from '../models/Repo.model';
import * as githubService from '../services/github.service';


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

    res.status(201).json({
      message: 'Repo ingested successfully',
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