import { IFileNode } from '../models/Repo.model';

const GITHUB_API_BASE = 'https://api.github.com';

const getHeaders = () => ({
  'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
  'Accept': 'application/vnd.github.v3+json',
  'X-GitHub-Api-Version': '2022-11-28',
});

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
  truncated: boolean; 
}

export const getRepoInfo = async (owner: string, name: string): Promise<GitHubRepoResponse> => {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${name}`;
  const response = await fetch(url, { headers: getHeaders() });

  if (!response.ok) {
  
    const error = await response.json() as { message: string };
    throw new Error(`GitHub API error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<GitHubRepoResponse>;
};

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

  
  return data.tree
    .filter(item => item.type === 'blob' || item.type === 'tree')
    .map(item => ({
      path: item.path,
      type: item.type,
      size: item.size,
      sha: item.sha,
    }));
};

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

  if (data.encoding === 'base64') {
    return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
  }

  throw new Error(`Unexpected encoding: ${data.encoding}`);
};