import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CONCIERGE_TOOLS, executeTool } from './tools';
import { CONCIERGE_SYSTEM_PROMPT } from './systemPrompt';

const MODEL = process.env.CONCIERGE_MODEL ?? 'llama-3.3-70b-versatile';
const MAX_TOOL_ITERATIONS = 5; // hard cap — bounds both cost and any risk of a runaway loop

// Built lazily, per call — NOT once at module load time. Constructing this
// at module scope can "freeze" the client with a stale/empty apiKey across
// Next.js dev-server hot reloads. Building it fresh on every call is
// cheap (no network I/O in the constructor) and avoids that entirely.
function getGroqClient(): OpenAI {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Missing GROQ_API_KEY. Check .env.local has a real value (not the placeholder), ' +
        'then fully restart the dev server: rm -rf .next && npm run dev'
    );
  }
  // Groq's API is OpenAI-compatible, so we use the official `openai` SDK
  // pointed at Groq's base URL rather than a Groq-specific SDK. Per Groq's
  // own docs (console.groq.com/docs/your-data), customer inference data is
  // NOT retained by default — no training, no logging of prompts/outputs
  // beyond what's needed to serve the request.
  return new OpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' });
}

export interface ConciergeTurn {
  role: 'user' | 'assistant';
  content: string;
}

// Runs the full tool-use loop for one user message and returns the final
// assistant text. `supabase` just needs read access to the public
// reference catalog — there's no signed-in user or personal data
// anywhere in this app for it to be scoped to.
export async function runConciergeTurn(
  supabase: SupabaseClient,
  history: ConciergeTurn[],
  userMessage: string
): Promise<string> {
  const groq = getGroqClient();

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: CONCIERGE_SYSTEM_PROMPT },
    ...history.map((h) => ({ role: h.role, content: h.content }) as OpenAI.Chat.ChatCompletionMessageParam),
    { role: 'user', content: userMessage },
  ];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 1024,
      tools: CONCIERGE_TOOLS,
      messages,
    });

    const choice = response.choices[0];
    const toolCalls = choice.message.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      // No more tools requested — this is the final answer.
      return choice.message.content ?? '';
    }

    // Execute every requested tool call, entirely server-side, against
    // the public catalog — then feed the results back.
    messages.push(choice.message);

    const toolResults = await Promise.all(
      toolCalls.map(async (call) => {
        const input = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        const result = await executeTool(supabase, call.function.name, input);
        return {
          role: 'tool' as const,
          tool_call_id: call.id,
          content: JSON.stringify(result),
        };
      })
    );

    messages.push(...toolResults);
  }

  return "I wasn't able to finish looking that up — try narrowing your question a bit.";
}
