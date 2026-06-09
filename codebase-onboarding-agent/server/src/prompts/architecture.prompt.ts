export const ARCHITECTURE_SYSTEM_PROMPT = `
You are a senior software architect helping a new developer understand an unfamiliar codebase.
Your job is to analyse the provided repository structure and files, then produce a clear,
accurate, and developer-friendly architecture overview.

Rules:
- Only describe what is actually present in the files you are given.
- Never hallucinate libraries, patterns, or features that are not visible in the code.
- Write as if you are onboarding a competent developer who is joining the team today.
- Be specific — name actual files, folders, and functions where relevant.
- Return only valid JSON matching the schema below. No prose outside the JSON.

Output schema:
{
  "summary": "2-3 sentence plain-English description of what this project does",
  "architecturePattern": "e.g. MVC, Microservices, Monolith, Layered, Event-driven",
  "techStack": {
    "language": "primary language",
    "framework": "main framework",
    "database": "database if present, else null",
    "other": ["array", "of", "other", "notable", "libraries"]
  },
  "entryPoints": [
    {
      "file": "relative file path",
      "description": "what starts here and why it matters"
    }
  ],
  "keyDirectories": [
    {
      "path": "directory path",
      "role": "what lives here and why it is important"
    }
  ],
  "dataFlow": "1-2 sentences describing how a request travels through the system end to end",
  "gotchas": [
    "specific things a new developer should know before touching this code"
  ],
  "suggestedReadingOrder": [
    {
      "step": 1,
      "file": "relative file path",
      "reason": "why to read this first"
    }
  ]
}
`.trim();

export const buildArchitecturePrompt = (params: {
  owner: string;
  repoName: string;
  language: string;
  fileTree: string[];
  packageJson: string | null;
  readme: string | null;
  entryFileContents: Array<{ path: string; content: string }>;
}): string => {
  const { owner, repoName, language, fileTree, packageJson, readme, entryFileContents } = params;

  const treePreview = fileTree.slice(0, 300).join('\n');
  const treeNote = fileTree.length > 300
    ? `\n[... ${fileTree.length - 300} more files not shown]`
    : '';

  const truncate = (text: string, maxChars: number): string =>
    text.length > maxChars ? text.slice(0, maxChars) + '\n[truncated]' : text;

  let prompt = `Analyse the following GitHub repository and return an architecture overview as JSON.\n\n`;
  prompt += `Repository: ${owner}/${repoName}\n`;
  prompt += `Primary language: ${language}\n\n`;

  if (packageJson) {
    prompt += `### package.json / dependency manifest\n\`\`\`json\n${truncate(packageJson, 3000)}\n\`\`\`\n\n`;
  }

  if (readme) {
    prompt += `### README\n${truncate(readme, 3000)}\n\n`;
  }

  prompt += `### File tree (${fileTree.length} files)\n\`\`\`\n${treePreview}${treeNote}\n\`\`\`\n\n`;

  if (entryFileContents.length > 0) {
    prompt += `### Key file contents\n\n`;
    for (const file of entryFileContents) {
      prompt += `#### ${file.path}\n\`\`\`\n${truncate(file.content, 2000)}\n\`\`\`\n\n`;
    }
  }

  prompt += `Return the JSON architecture overview now.`;
  return prompt;
};