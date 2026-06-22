// OpenRouter client for Claude models.
// Uses two tiers:
//   - Sonnet 4.5 for full strategy/create/coach (better reasoning)
//   - Haiku 4.5 for quick chat (faster, cheaper)

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const MODELS = {
  sonnet: "anthropic/claude-sonnet-4.5",
  haiku: "anthropic/claude-haiku-4.5",
} as const;

export type ChatRole = "system" | "user" | "assistant";

// Content is usually a plain string. For vision (Claude "looking" at an
// uploaded product photo) OpenRouter also accepts an array of content parts.
export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };
export type ChatContent = string | ChatContentPart[];

export interface ChatMessage {
  role: ChatRole;
  content: ChatContent;
}

export interface ChatOptions {
  model?: keyof typeof MODELS;
  system?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResult {
  text: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function chat(opts: ChatOptions): Promise<ChatResult> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set in .env.local");
  }

  const model = MODELS[opts.model ?? "sonnet"];

  const messages: ChatMessage[] = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push(...opts.messages);

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      // OpenRouter recommends these for analytics/leaderboards.
      "HTTP-Referer": "https://stratege.in",
      "X-Title": "Stratège",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1500,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    throw new Error("OpenRouter returned no message content");
  }
  return { text, model, usage: data?.usage };
}

// Backward-compatible thin wrapper for the original signature.
export async function chatWithClaude(
  messages: { role: string; content: string }[]
) {
  const filtered: ChatMessage[] = messages
    .filter(
      (m) =>
        m.role === "user" || m.role === "assistant" || m.role === "system"
    )
    .map((m) => ({ role: m.role as ChatRole, content: m.content }));
  const r = await chat({ messages: filtered });
  return r.text;
}
