import { IFileNode } from '../models/Repo.model';

// The base URL for all GitHub REST API v3 calls
const GITHUB_API_BASE = 'https://api.github.com';

// Build headers for every GitHub API request
// The Authorization header authenticates you and raises your rate limit to 5000/hour
// The Accept header tells GitHub to use their v3 API response format
const getHeaders = () => ({
  'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
  'Accept': 'application/vnd.github.v3+json',
  'X-GitHub-Api-Version': '2022-11-28',
});

// Shape of the response from GET /repos/{owner}/{repo}
interface GitHubRepoResponse {
  name: string;
  full_name: string;
  description: string | null;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  owner: { login: string };
  private: boolean;
}

// Shape of a single item from the Git tree API response
interface GitHubTreeItem {
  path: string;
  type: 'blob' | 'tree';
  size?: number;
  sha: string;
  url: string;
}

interface GitHubTreeResponse {
  sha: string;
  tree: GitHubTreeItem[];
  truncated: boolean; // true if repo > 100,000 files (very rare)
}

// Fetch basic repo metadata
export const getRepoInfo = async (owner: string, name: string): Promise<GitHubRepoResponse> => {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${name}`;
  const response = await fetch(url, { headers: getHeaders() });

  if (!response.ok) {
    // response.status 404 = repo not found, 403 = rate limited, etc.
    const error = await response.json() as { message: string };
    throw new Error(`GitHub API error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<GitHubRepoResponse>;
};

// Fetch the COMPLETE file tree of a repo in a single API call
// ?recursive=1 tells GitHub to flatten the entire tree (all nested folders)
// instead of making you recursively fetch each subfolder
export const getRepoFileTree = async (
  owner: string,
  name: string,
  branch: string
): Promise<IFileNode[]> => {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${name}/git/trees/${branch}?recursive=1`;
  const response = await fetch(url, { headers: getHeaders() });

  if (!response.ok) {
    const error = await response.json() as { message: string };
    throw new Error(`GitHub tree API error ${response.status}: ${error.message}`);
  }

  const data = await response.json() as GitHubTreeResponse;

  if (data.truncated) {
    console.warn(`Warning: repo ${owner}/${name} has too many files; tree is truncated`);
  }

  // Map GitHub's format to our IFileNode format
  // We only care about files (blob) and folders (tree) — filter out anything else
  return data.tree
    .filter(item => item.type === 'blob' || item.type === 'tree')
    .map(item => ({
      path: item.path,
      type: item.type,
      size: item.size,
      sha: item.sha,
    }));
};

// Fetch the raw content of a single file
// Returns the file content as a plain string
export const getFileContent = async (
  owner: string,
  name: string,
  filePath: string
): Promise<string> => {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${name}/contents/${filePath}`;
  const response = await fetch(url, { headers: getHeaders() });

  if (!response.ok) {
    const error = await response.json() as { message: string };
    throw new Error(`GitHub contents API error ${response.status}: ${error.message}`);
  }

  const data = await response.json() as { content: string; encoding: string };

  // GitHub returns file content as Base64-encoded string
  // We decode it to get the actual text
  // The replace removes newlines GitHub inserts every 60 chars
  if (data.encoding === 'base64') {
    return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
  }

  throw new Error(`Unexpected encoding: ${data.encoding}`);
};