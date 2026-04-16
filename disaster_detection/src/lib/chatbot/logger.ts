import path from "path";
import { promises as fs } from "fs";

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "chatbot-queries.ndjson");

type LogEntry = {
  timestamp: string;
  userQuestion: string;
  intent: string;
  params: Record<string, string>;
  recordCount: number;
  usedMock: boolean;
  messagePreview?: string;
  error?: string;
};

async function ensureDir() {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch {
    // ignore – logging must never crash the API
  }
}

export async function logQuery(entry: LogEntry): Promise<void> {
  try {
    await ensureDir();
    const line = JSON.stringify(entry) + "\n";
    await fs.appendFile(LOG_FILE, line, "utf8");
  } catch {
    // ignore – logging failures are non-fatal
  }
}
<<<<<<< HEAD

=======
>>>>>>> 3668e68178c76ba660fb92926b2d0f539f5880f3
