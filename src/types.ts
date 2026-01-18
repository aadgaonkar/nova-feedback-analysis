import type { D1Database } from './services/db';
import type { AIBinding } from './services/ai';

export interface Env {
  DB: D1Database;
  AI: AIBinding;
  MODEL_NAME?: string;
  SLACK_WEBHOOK_URL?: string;
}
