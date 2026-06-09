import { Message } from '../services/groq.service';

interface ArchitecturePromptInput {
  repoName: string;
  owner: string;
  language: string;
  packageJson: string | null;
  readme: string | null;
  entryPoints?: string[];
  topLevelStructure?: string;
  fileCount?: number;
  sampleFilePaths?: string[];
  fileTree?: string[];
  entryFileContents?: Array<{ path: string; content: string }>;
}

export const ARCHITECTURE_SYSTEM_PROMPT = `You are an expert software architect who specialises in onboarding new developers to unfamiliar codebases.

Your job is to analyse a GitHub repository and produce a clear, structured, and accurate architectural overview.

You must respond with ONLY valid JSON — no preamble, no markdown fences, no explanation outside the JSON.

The JSON must follow this exact structure:
{
  "summary": "2-3 sentence plain-English description of what this project does and who it's for",

  "techStack": [
    { "name": "Technology name", "role": "what it does in this project", "category": "frontend|backend|database|devtools|testing|other" }
  ],

  "architecturePattern": {
    "name": "The pattern name e.g. MVC, Microservices, Monolith, JAMstack, etc.",
    "description": "1-2 sentences explaining how this pattern is applied in this specific repo"
  },

  "entryPoints": [
    { "path": "relative file path", "description": "what happens when this file runs" }
  ],

  "keyDirectories": [
    { "path": "directory path", "purpose": "what lives here and why it matters" }
  ],

  "dataFlow": "A plain-English description of how a typical request or action flows through the system from trigger to response",

  "gotchas": [
    "A specific, actionable thing a new developer is likely to miss or misunderstand about this codebase"
  ],

  "setupSteps": [
    "Step-by-step instruction to get this project running locally"
  ],

  "firstFilesToRead": [
    { "path": "file path", "reason": "why a new dev should read this file first" }
  ]
}

Rules:
- Base your analysis ONLY on the provided context. Do not invent details.
- If you cannot determine something, omit that field rather than guessing.
- gotchas should be specific to THIS codebase, not generic advice.
- techStack entries should only include technologies you can confirm from the provided files.
- Keep descriptions concise — a new developer needs clarity, not essays.`;

export const buildArchitecturePrompt = (input: ArchitecturePromptInput): string => {
  return buildUserMessage(input);
};

const buildUserMessage = (input: ArchitecturePromptInput): string => {
  const sections: string[] = [
    `# Repository: ${input.owner}/${input.repoName}`,
    `Primary Language: ${input.language}`,
    `Total Files: ${input.fileCount ?? 'Unknown'}`,
    '',
  ];

  if (input.packageJson) {
    sections.push('## package.json');
    sections.push(input.packageJson.slice(0, 3000));
    sections.push('');
  }

  if (input.readme) {
    sections.push('## README (first 2000 chars)');
    sections.push(input.readme.slice(0, 2000));
    sections.push('');
  }

  if (input.topLevelStructure) {
    sections.push('## Top-level directory structure');
    sections.push(input.topLevelStructure);
    sections.push('');
  } else if (input.fileTree) {
    sections.push('## File tree');
    sections.push(input.fileTree.slice(0, 100).join('\n'));
    sections.push('');
  }

  if (input.entryPoints && input.entryPoints.length > 0) {
    sections.push('## Likely entry points');
    sections.push(input.entryPoints.join('\n'));
    sections.push('');
  } else if (input.entryFileContents && input.entryFileContents.length > 0) {
    sections.push('## Entry files');
    for (const file of input.entryFileContents) {
      sections.push(`### ${file.path}`);
      sections.push(file.content.slice(0, 500));
      sections.push('');
    }
  }

  if (input.sampleFilePaths && input.sampleFilePaths.length > 0) {
    sections.push('## Sample file paths (representative selection)');
    sections.push(input.sampleFilePaths.join('\n'));
  }

  return sections.join('\n');
};