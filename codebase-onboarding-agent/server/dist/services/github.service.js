"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileContent = exports.getRepoFileTree = exports.getRepoInfo = void 0;
const GITHUB_API_BASE = 'https://api.github.com';
const getHeaders = () => ({
    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28',
});
const getRepoInfo = async (owner, name) => {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${name}`;
    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`GitHub API error ${response.status}: ${error.message}`);
    }
    return response.json();
};
exports.getRepoInfo = getRepoInfo;
const getRepoFileTree = async (owner, name, branch) => {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${name}/git/trees/${branch}?recursive=1`;
    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`GitHub tree API error ${response.status}: ${error.message}`);
    }
    const data = await response.json();
    if (data.truncated) {
        console.warn(`Warning: repo ${owner}/${name} has too many files; tree is truncated`);
    }
    return data.tree
        .filter(item => item.type === 'blob' || item.type === 'tree')
        .map(item => ({
        path: item.path,
        type: item.type,
        size: item.size,
        sha: item.sha,
    }));
};
exports.getRepoFileTree = getRepoFileTree;
const getFileContent = async (owner, name, filePath) => {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${name}/contents/${filePath}`;
    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`GitHub contents API error ${response.status}: ${error.message}`);
    }
    const data = await response.json();
    if (data.encoding === 'base64') {
        return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
    }
    throw new Error(`Unexpected encoding: ${data.encoding}`);
};
exports.getFileContent = getFileContent;
