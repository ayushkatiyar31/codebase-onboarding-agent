"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRepo = exports.ingestRepo = void 0;
const Repo_model_1 = require("../models/Repo.model");
const githubService = __importStar(require("../services/github.service"));
// POST /api/repo/ingest
// Body: { repoUrl: "https://github.com/owner/repo" }
// What it does: fetches repo metadata + file tree from GitHub, saves to MongoDB
const ingestRepo = async (req, res) => {
    try {
        const { repoUrl } = req.body;
        if (!repoUrl) {
            res.status(400).json({ error: 'repoUrl is required' });
            return;
        }
        // Parse the GitHub URL to extract owner and repo name
        // e.g. "https://github.com/expressjs/express" → owner: "expressjs", name: "express"
        const parsed = parseGitHubUrl(repoUrl);
        if (!parsed) {
            res.status(400).json({ error: 'Invalid GitHub URL. Expected format: https://github.com/owner/repo' });
            return;
        }
        const { owner, name } = parsed;
        // Check if we already have this repo in our database
        // This avoids hitting the GitHub API again for repos we've already ingested
        const existing = await Repo_model_1.Repo.findOne({ fullName: `${owner}/${name}` });
        if (existing && existing.status === 'ready') {
            res.json({ message: 'Repo already ingested', repo: existing });
            return;
        }
        // Fetch metadata from GitHub (name, description, stars, etc.)
        const repoInfo = await githubService.getRepoInfo(owner, name);
        // Fetch the complete file tree
        const fileTree = await githubService.getRepoFileTree(owner, name, repoInfo.default_branch);
        // Save (or update if re-ingesting) to MongoDB
        // findOneAndUpdate with upsert:true = "update if exists, insert if not"
        const repo = await Repo_model_1.Repo.findOneAndUpdate({ fullName: `${owner}/${name}` }, {
            owner,
            name,
            fullName: `${owner}/${name}`,
            description: repoInfo.description || '',
            defaultBranch: repoInfo.default_branch,
            language: repoInfo.language || 'Unknown',
            stars: repoInfo.stargazers_count,
            fileTree,
            status: 'ready',
        }, {
            new: true, // return the updated document, not the old one
            upsert: true, // insert if doesn't exist
            runValidators: true, // run schema validation on update too
        });
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('ingestRepo error:', message);
        res.status(500).json({ error: message });
    }
};
exports.ingestRepo = ingestRepo;
// GET /api/repo/:owner/:name
// Returns stored repo data (metadata + file tree) from MongoDB
const getRepo = async (req, res) => {
    try {
        const { owner, name } = req.params;
        const repo = await Repo_model_1.Repo.findOne({ fullName: `${owner}/${name}` });
        if (!repo) {
            res.status(404).json({ error: 'Repo not found. Ingest it first via POST /api/repo/ingest' });
            return;
        }
        res.json({ repo });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
};
exports.getRepo = getRepo;
// Helper: parse a GitHub URL string into { owner, name }
// Returns null if the URL doesn't match the expected format
const parseGitHubUrl = (url) => {
    try {
        const parsed = new URL(url);
        // Must be github.com
        if (parsed.hostname !== 'github.com')
            return null;
        // pathname is like "/expressjs/express" or "/expressjs/express/"
        const parts = parsed.pathname.replace(/\/$/, '').split('/').filter(Boolean);
        if (parts.length < 2)
            return null;
        return { owner: parts[0], name: parts[1] };
    }
    catch {
        return null; // new URL() throws if the string isn't a valid URL
    }
};
