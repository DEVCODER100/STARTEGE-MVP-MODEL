// Quick test: hits OpenRouter with a minimal prompt.
// Usage: npm run test:claude
import { config } from "dotenv";
config({ path: ".env.local" });

if (!process.env.OPENROUTER_API_KEY) {
  console.error("✗ OPENROUTER_API_KEY missing in .env.local");
  process.exit(1);
}

const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://stratege.in",
    "X-Title": "Stratège",
  },
  body: JSON.stringify({
    model: "anthropic/claude-haiku-4.5",
    messages: [
      {
        role: "system",
        content:
          "You are Stratège, an India-first AI marketing assistant. Reply in one short sentence.",
      },
      { role: "user", content: "Say hi and tell me what you do." },
    ],
    max_tokens: 100,
  }),
});

if (!res.ok) {
  console.error("✗", res.status, await res.text());
  process.exit(1);
}

const data = await res.json();
console.log("✓ Model:", data.model);
console.log("✓ Reply:", data.choices?.[0]?.message?.content);
console.log(
  "  Tokens:",
  data.usage?.prompt_tokens,
  "in /",
  data.usage?.completion_tokens,
  "out"
);
