import { Message } from '../services/groq.service';
import { GraphStats } from '../services/dependencyParser.service';

interface WalkthroughPromptInput {
  repoName: string;
  entryPoints: string[];
  mostImported: Array<{ filePath: string; importedByCount: number }>;
  sampleFileContents: Array<{ path: string; snippet: string }>;
}

export const buildWalkthroughPrompt = (input: WalkthroughPromptInput): Message[] => {
  return [
    {
      role: 'system',
      content: `You are creating a guided code walkthrough for a new developer joining the "${input.repoName}" project.

You will be given:
- The repo's likely entry points (files nothing else imports — where execution starts)
- The most-imported files (files many other files depend on — likely core utilities/types)
- Short snippets from key files

Produce a 5-7 step walkthrough that takes a new developer from "knows nothing about this repo" to "understands the core flow". Order matters — start broad, get specific.

Respond with ONLY valid JSON in this exact structure:
{
  "steps": [
    {
      "stepNumber": 1,
      "filePath": "exact file path from the provided data",
      "title": "Short title for this step, e.g. 'Application entry point'",
      "whatToLookFor": "1-2 sentences telling the developer what to pay attention to in this file",
      "whyItMatters": "1 sentence on why this file is important to understand early"
    }
  ]
}

Rules:
- Only reference file paths that were actually provided to you
- Order from entry point → core logic → supporting utilities
- Be specific — reference actual function/variable names if visible in the snippets`,
    },
    {
      role: 'user',
      content: buildUserMessage(input),
    },
  ];
};

const buildUserMessage = (input: WalkthroughPromptInput): string => {
  const sections: string[] = [
    `# Repository: ${input.repoName}`,
    '',
    '## Entry points (nothing imports these — likely where execution starts)',
    input.entryPoints.slice(0, 5).join('\n') || 'None detected',
    '',
    '## Most-imported files (many files depend on these)',
    input.mostImported
      .slice(0, 8)
      .map(f => `${f.filePath} (imported by ${f.importedByCount} files)`)
      .join('\n') || 'None detected',
    '',
    '## File snippets',
  ];

  for (const file of input.sampleFileContents) {
    sections.push(`### ${file.path}`);
    sections.push('```');
    sections.push(file.snippet);
    sections.push('```');
    sections.push('');
  }

  return sections.join('\n');
};