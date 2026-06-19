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
exports.chunkRepo = exports.getFileContent = exports.getRepo = exports.ingestRepo = void 0;
const Chunk_model_1 = require("../models/Chunk.model");
const Repo_model_1 = require("../models/Repo.model");
const githubService = __importStar(require("../services/github.service"));
const chunker_service_1 = require("../services/chunker.service");
const parseGitHubUrl = (url) => {
    try {
        const parsed = new URL(url);
        if (parsed.hostname !== 'github.com')
            return null;
        const parts = parsed.pathname.replace(/\/$/, '').split('/').filter(Boolean);
        if (parts.length < 2)
            return null;
        return { owner: parts[0], name: parts[1] };
    }
    catch {
        return null;
    }
};
// Runs chunking without blocking the HTTP response
// Errors here are logged but don't affect the user
const triggerChunkingInBackground = async (repoId, owner, name, fileTree) => {
    try {
        const filesToProcess = fileTree.filter(node => node.type === 'blob' && !(0, chunker_service_1.shouldSkipFile)(node.path));
        await Chunk_model_1.Chunk.deleteMany({ repoId });
        const BATCH_SIZE = 10;
        for (let i = 0; i < filesToProcess.length; i += BATCH_SIZE) {
            const batch = filesToProcess.slice(i, i + BATCH_SIZE);
            await Promise.allSettled(batch.map(async (file) => {
                const content = await githubService.getFileContent(owner, name, file.path);
                const chunks = (0, chunker_service_1.chunkFile)(content, file.path);
                if (chunks.length > 0) {
                    await Chunk_model_1.Chunk.insertMany(chunks.map(chunk => ({ ...chunk, repoId })));
                }
            }));
            if (i + BATCH_SIZE < filesToProcess.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        console.log(`Background chunking complete for ${owner}/${name}`);
        // Now generate embeddings for all the chunks we just created
        // Dynamic import avoids circular dependency
        const { generateEmbeddingsForRepo } = await Promise.resolve().then(() => __importStar(require('../services/vectorSearch.service')));
        await generateEmbeddingsForRepo(repoId);
        console.log(`Background embedding complete for ${owner}/${name}`);
    }
    catch (error) {
        console.error(`Background chunking failed for ${owner}/${name}:`, error);
    }
};
const ingestRepo = async (req, res) => {
    try {
        const { repoUrl } = req.body;
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
        const existing = await Repo_model_1.Repo.findOne({ fullName: `${owner}/${name}` });
        if (existing && existing.status === 'ready') {
            res.json({ message: 'Repo already ingested', repo: existing });
            return;
        }
        const repoInfo = await githubService.getRepoInfo(owner, name);
        const fileTree = await githubService.getRepoFileTree(owner, name, repoInfo.default_branch);
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
            new: true,
            upsert: true,
            runValidators: true,
        });
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('ingestRepo error:', message);
        res.status(500).json({ error: message });
    }
};
exports.ingestRepo = ingestRepo;
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
const getFileContent = async (req, res) => {
    try {
        const owner = Array.isArray(req.params.owner) ? req.params.owner[0] : req.params.owner;
        const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
        const filePath = req.query.path;
        if (!filePath) {
            res.status(400).json({ error: 'Query param "path" is required' });
            return;
        }
        if ((0, chunker_service_1.shouldSkipFile)(filePath)) {
            res.status(400).json({ error: 'Binary or generated file cannot display' });
            return;
        }
        const content = await githubService.getFileContent(owner, name, filePath);
        res.json({ content, filePath });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
};
exports.getFileContent = getFileContent;
const chunkRepo = async (req, res) => {
    try {
        const owner = Array.isArray(req.params.owner) ? req.params.owner[0] : req.params.owner;
        const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
        const repo = await Repo_model_1.Repo.findOne({ fullName: `${owner}/${name}` });
        if (!repo) {
            res.status(404).json({ error: 'Repo not found. Ingest it first.' });
            return;
        }
        await Chunk_model_1.Chunk.deleteMany({ repoId: repo._id });
        const filesToProcess = repo.fileTree.filter(node => node.type === 'blob' && !(0, chunker_service_1.shouldSkipFile)(node.path));
        console.log(`Chunking ${filesToProcess.length} files for ${owner}/${name}...`);
        let totalChunks = 0;
        const errors = [];
        const BATCH_SIZE = 10;
        for (let i = 0; i < filesToProcess.length; i += BATCH_SIZE) {
            const batch = filesToProcess.slice(i, i + BATCH_SIZE);
            const results = await Promise.allSettled(batch.map(async (file) => {
                const content = await githubService.getFileContent(owner, name, file.path);
                const chunks = (0, chunker_service_1.chunkFile)(content, file.path);
                if (chunks.length > 0) {
                    await Chunk_model_1.Chunk.insertMany(chunks.map(chunk => ({ ...chunk, repoId: repo._id })));
                }
                return chunks.length;
            }));
            for (const result of results) {
                if (result.status === 'fulfilled') {
                    totalChunks += result.value;
                }
                else {
                    errors.push(result.reason instanceof Error ? result.reason.message : 'Unknown error');
                }
            }
            if (i + BATCH_SIZE < filesToProcess.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        await Repo_model_1.Repo.findByIdAndUpdate(repo._id, { status: 'ready' });
        res.json({
            message: 'Chunking complete',
            totalChunks,
            filesProcessed: filesToProcess.length - errors.length,
            errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
};
exports.chunkRepo = chunkRepo;
