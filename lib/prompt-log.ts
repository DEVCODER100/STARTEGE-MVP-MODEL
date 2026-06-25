import { appendFile, mkdir } from "fs/promises";
import path from "path";

// Prompt visibility for image generation. console.log shows up in the dev
// terminal as each image generates; the log file builds a reviewable history.
// File writes are best-effort and skipped on Vercel (read-only repo dir).

export function logPromptConsole(prompt: string): void {
  console.log("═══════ IDEOGRAM PROMPT ═══════");
  console.log(prompt);
  console.log(`═══════ (${prompt.length} chars) ═══════`);
}

export async function logPromptFile(prompt: string, url: string): Promise<void> {
  if (process.env.VERCEL) return; // serverless FS is read-only / ephemeral
  try {
    const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
    const line = `[${ts}]\nURL: ${url}\nPROMPT: ${prompt}\n───────────────────────────────────\n`;
    const dir = path.join(process.cwd(), "logs");
    await mkdir(dir, { recursive: true });
    await appendFile(path.join(dir, "image-prompts.log"), line, "utf8");
  } catch {
    /* logging must never break generation */
  }
}
