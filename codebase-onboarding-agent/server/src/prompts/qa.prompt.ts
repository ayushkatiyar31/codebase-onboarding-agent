import { Message } from '../services/groq.service';
import { SearchResult } from '../services/vectorSearch.service';

interface QAPromptInput {
  question: string;
  searchResults: SearchResult[];
  repoName: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const MAX_CONTEXT_CHARS = 12000;

export const buildQAPrompt = (input: QAPromptInput): Message[] => {
  let runningLength = 0;
  const includedChunks: typeof input.searchResults = [];

  for (const result of input.searchResults) {
    const chunkLength = result.chunk.content.length + 200;

    if (
      runningLength + chunkLength > MAX_CONTEXT_CHARS &&
      includedChunks.length > 0
    ) {
      break;
    }

    includedChunks.push(result);
    runningLength += chunkLength;
  }

  const contextBlock = includedChunks
    .map((result, idx) => {
      const { chunk, score } = result;

      return [
        `[SOURCE ${idx + 1}] ${chunk.filePath} (lines ${chunk.startLine}-${chunk.endLine}) — ${chunk.name} [similarity: ${score}]`,
        '```' + chunk.language,
        chunk.content,
        '```',
      ].join('\n');
    })
    .join('\n\n');

  const distinctFiles = [
    ...new Set(includedChunks.map(r => r.chunk.filePath)),
  ];

  const messages: Message[] = [
    {
      role: 'system',
      content: `You are an expert code assistant helping a developer understand the "${input.repoName}" codebase.

You answer questions based ONLY on the provided source code context below, which spans ${distinctFiles.length} file(s): ${distinctFiles.join(', ')}.

When answering:
- If the question is about a SPECIFIC file, cover that file's relevant logic thoroughly — every function/section provided is part of the same file unless stated otherwise.
- If the question is broader, synthesize across ALL the provided files — explain how they connect, not just one in isolation.
- Be specific: reference actual function names, variable names, and file paths from the context
- Use inline code formatting (\`backticks\`) for code identifiers
- If the provided context doesn't fully answer the question, say what's missing rather than guessing
- End answers with a "Sources:" section listing which [SOURCE N] chunks you used and from which files

Format: Use markdown. Keep answers focused and scannable.`,
    },
  ];

  const recentHistory = input.conversationHistory.slice(-4);

  for (const turn of recentHistory) {
    messages.push({
      role: turn.role,
      content: turn.content,
    });
  }

  messages.push({
    role: 'user',
    content: `Here is the relevant source code from the repository:

${contextBlock}

---

Question: ${input.question}`,
  });

  return messages;
};