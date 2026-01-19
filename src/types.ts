import type { D1Database } from './services/db';
import type { AIBinding } from './services/ai';

export interface Env {
  DB: D1Database;
  AI: AIBinding;
  MODEL_NAME?: string;
  SLACK_WEBHOOK_URL?: string;
  
  // Email report config
  REPORT_FROM?: string;
  REPORT_RECIPIENTS?: string; // comma-separated
  // Debug route secret for /debug/run-daily-report (use only in dev)
  REPORT_DEBUG_SECRET?: string;
}
