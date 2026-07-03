import { readFileSync } from "node:fs";
import { join } from "node:path";

// Loads brain.md (the project knowledge base) so the desk chat can answer
// questions about Stratège itself — features, workflows, limits — accurately.
// Read once per server instance; missing file degrades to "" (chat still works).

let cached: string | null = null;

export function getBrain(): string {
  if (cached !== null) return cached;
  try {
    cached = readFileSync(join(process.cwd(), "brain.md"), "utf8").slice(0, 60_000);
  } catch {
    cached = "";
  }
  return cached;
}

// Framed block to append to the chat system prompt.
export function brainContext(): string {
  const brain = getBrain();
  if (!brain) return "";
  return `

─── STRATÈGE PRODUCT KNOWLEDGE BASE (internal) ───
You also have Stratège's own product knowledge base below. Use it to answer any
question about Stratège itself (features, how image generation works, limits,
pages, pricing state) accurately and concisely, in your own words. Do not dump
it verbatim, and do not surface internal file paths, environment variable names,
or security details unless the user explicitly asks about implementation.

${brain}
─── END KNOWLEDGE BASE ───`;
}
