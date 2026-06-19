import { Message } from '../services/groq.service';
import { SearchResult } from '../services/vectorSearch.service';

interface QAPromptInput {
  question: string;
  searchResults: SearchResult[];
  repoName: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export const buildQAPrompt = (input: QAPromptInput): Message[] => {

  const contextBlock = input.searchResults
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

  const messages: Message[] = [
    {
      role: 'system',
      content: `You are an expert code assistant helping a developer understand the "${input.repoName}" codebase.

You answer questions based ONLY on the provided source code context. Never invent details, never reference code that wasn't provided.

When answering:
- Be specific and reference actual function names, variable names, and file paths from the context
- If the answer spans multiple files, explain how they connect
- Use inline code formatting (\`backticks\`) for code identifiers
- If the provided context doesn't contain enough information to answer confidently, say so — don't guess
- End answers with a "Sources:" section listing which [SOURCE N] chunks you used

Format: Use markdown. Keep answers focused and scannable. A new developer should be able to act on your answer immediately.`,
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
    content: `Here is the relevant source code from the repository:\n\n${contextBlock}\n\n---\n\nQuestion: ${input.question}`,
  });

  return messages;
};