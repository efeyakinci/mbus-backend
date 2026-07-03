import fs from "node:fs/promises";
import path from "node:path";

const feedbackFile =
  process.env.FEEDBACK_FILE ?? path.join(process.cwd(), "feedback.jsonl");

export async function appendFeedback(feedback: string): Promise<void> {
  const line = JSON.stringify({
    receivedAt: new Date().toISOString(),
    feedback,
  });
  await fs.appendFile(feedbackFile, line + "\n");
}
