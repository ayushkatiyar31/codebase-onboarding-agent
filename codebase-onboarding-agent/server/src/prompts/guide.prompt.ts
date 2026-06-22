import { Message } from '../services/groq.service';
import { ArchitectureAnalysis } from '../services/analysis.service';
import { WalkthroughStep } from '../services/walkthrough.service';
import { GraphStats } from '../services/dependencyParser.service';

interface GuidePromptInput {
  repoName: string;
  owner: string;
  description: string;
  language: string;
  stars: number;
  analysis: ArchitectureAnalysis;
  walkthroughSteps: WalkthroughStep[];
  graphStats: GraphStats;
}

export const buildGuidePrompt = (input: GuidePromptInput): Message[] => {
  return [
    {
      role: 'system',
      content: `You are a senior engineer writing an onboarding document for a new developer joining the "${input.repoName}" project.

You will be given pre-computed structured data: an architecture analysis, a recommended reading order (walkthrough), and dependency graph statistics. Your job is to weave these into ONE cohesive, well-written Markdown document — not a dump of the raw data.

Output ONLY the Markdown document. No preamble, no "Here's the guide", no closing remarks outside the document itself.

Use this structure:

# [Repo Name] — Onboarding Guide

A 2-3 sentence welcoming intro to the project.

## What This Project Does
Plain-English explanation using the provided summary.

## Tech Stack
A table: Technology | Role | Category

## Architecture
Explain the architecture pattern and how data flows through the system. Reference the entry points and key directories naturally in prose, not just as a list.

## Getting Started
Numbered setup steps.

## Recommended Reading Order
Turn the walkthrough steps into a numbered list with brief context for each — this should read as guidance, not just a file list.

## Key Directories
A table: Directory | Purpose

## Things to Watch Out For
The gotchas, written as a bulleted list with brief context.

## Project Stats
- Total files analysed
- Entry points: list them
- Most depended-upon files: list top 3-5

Rules:
- Write in a warm, helpful, professional tone — like a teammate, not a manual
- Use proper Markdown: headers, tables, code spans for file paths and identifiers
- Do not invent any information not present in the provided data
- Keep it scannable — use short paragraphs, bullet points, and tables over long prose blocks`,
    },
    {
      role: 'user',
      content: buildUserMessage(input),
    },
  ];
};

const buildUserMessage = (input: GuidePromptInput): string => {
  const sections: string[] = [
    `# Source data for: ${input.owner}/${input.repoName}`,
    `Description: ${input.description || 'No description provided'}`,
    `Primary language: ${input.language}`,
    `Stars: ${input.stars}`,
    '',
    '## Architecture Analysis (JSON)',
    JSON.stringify(input.analysis, null, 2),
    '',
    '## Walkthrough Steps (JSON)',
    JSON.stringify(input.walkthroughSteps, null, 2),
    '',
    '## Dependency Graph Stats (JSON)',
    JSON.stringify(input.graphStats, null, 2),
  ];

  return sections.join('\n');
};