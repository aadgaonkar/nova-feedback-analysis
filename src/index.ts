import type { Env } from './types';
import { handleCors, successResponse, errorResponse } from './services/response';
import {
  insertFeedback,
  getPendingFeedback,
  getFeedbackById,
  insertAnalysis,
  getSummaryData,
  type FeedbackRaw,
} from './services/db';
import { analyzeFeedback } from './services/ai';
import { sendSlackDigest } from './services/slack';
import { dashboardHTML } from './dashboard';
import { sendEmailViaMailChannels } from './services/email';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // Dashboard route
      if (path === '/' && method === 'GET') {
        return new Response(dashboardHTML, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      // POST /feedback - Ingest feedback
      if (path === '/feedback' && method === 'POST') {
        const body = (await request.json()) as Partial<FeedbackRaw>;

        if (!body.text || !body.source || !body.timestamp) {
          return errorResponse('Missing required fields: text, source, timestamp');
        }

        const id = await insertFeedback(env.DB, body as FeedbackRaw);
        return successResponse({ id });
      }

      // POST /analyze - Analyze feedback
      if (path === '/analyze' && method === 'POST') {
        const body = (await request.json()) as { mode?: string; id?: number; limit?: number };
        const modelName = env.MODEL_NAME || '@cf/meta/llama-3.1-8b-instruct';

        if (body.mode === 'pending') {
          const limit = body.limit || 25;
          const pending = await getPendingFeedback(env.DB, limit);
          const results = [];

          for (const feedback of pending) {
            if (!feedback.id) continue;

            const analysis = await analyzeFeedback(env.AI, modelName, feedback.text);
            const analysisId = await insertAnalysis(env.DB, {
              ...analysis,
              feedback_id: feedback.id,
            });

            results.push({
              feedback_id: feedback.id,
              analysis_id: analysisId,
              ...analysis,
            });
          }

          return successResponse({ analyzed: results.length, results });
        }

        if (body.id) {
          const feedback = await getFeedbackById(env.DB, body.id);
          if (!feedback) {
            return errorResponse('Feedback not found', 404);
          }

          const analysis = await analyzeFeedback(env.AI, modelName, feedback.text);
          const analysisId = await insertAnalysis(env.DB, {
            ...analysis,
            feedback_id: feedback.id!, // TS-safe
          });

          return successResponse({
            feedback_id: feedback.id,
            analysis_id: analysisId,
            ...analysis,
          });
        }

        return errorResponse('Either mode="pending" or id must be provided');
      }

      // GET /api/summary - Get summary data
      if (path === '/api/summary' && method === 'GET') {
        const summary = await getSummaryData(env.DB);
        return successResponse(summary);
      }

      // POST /notify/slack - Send Slack digest
      if (path === '/notify/slack' && method === 'POST') {
        if (!env.SLACK_WEBHOOK_URL) {
          return errorResponse('SLACK_WEBHOOK_URL not configured', 503);
        }

        const summary = await getSummaryData(env.DB);
        const success = await sendSlackDigest(env.SLACK_WEBHOOK_URL, summary);

        return successResponse({ sent: success });
      }

      // POST /debug/run-daily-report?secret=...
      // (manual trigger for local dev)
      if (path === '/debug/run-daily-report' && method === 'POST') {
        const secret = url.searchParams.get('secret') || '';
        if (!env.REPORT_DEBUG_SECRET || secret !== env.REPORT_DEBUG_SECRET) {
          return errorResponse('Unauthorized', 401);
        }

        await runDailyEmail(env);
        return successResponse({ ok: true });
      }

      return errorResponse('Not found', 404);
    } catch (error) {
      console.error('Error:', error);
      return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500);
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log('✅ Cron triggered:', event.cron);
    ctx.waitUntil(runDailyEmail(env));
  },
};

async function runDailyEmail(env: Env) {
  console.log('🔥 runDailyEmail entered');

  // These must exist (set in wrangler.toml or .dev.vars)
  const apiKey = env.MAILCHANNELS_API_KEY;
  const from = env.REPORT_FROM;
  const recipients = env.REPORT_RECIPIENTS;

  console.log('MAILCHANNELS_API_KEY present:', Boolean(apiKey), 'length:', apiKey?.length);
  console.log('REPORT_FROM:', from);
  console.log('REPORT_RECIPIENTS:', recipients);

  if (!apiKey) {
    console.error('❌ MAILCHANNELS_API_KEY missing');
    return;
  }
  if (!from || !recipients) {
    console.error('❌ REPORT_FROM or REPORT_RECIPIENTS missing');
    return;
  }

  const summary = await getSummaryData(env.DB);
  const date = new Date().toISOString().slice(0, 10);

  const subject = `Daily Feedback Report — ${date}`;

  const text = [
    `Daily Feedback Report (${date})`,
    ``,
    `Total feedback: ${summary.totalCount}`,
    ``,
    `Sentiment breakdown:`,
    `- Positive: ${summary.countsBySentiment.positive ?? 0}`,
    `- Neutral: ${summary.countsBySentiment.neutral ?? 0}`,
    `- Negative: ${summary.countsBySentiment.negative ?? 0}`,
    ``,
    `Top themes:`,
    ...(summary.topThemes?.length
      ? summary.topThemes.map((t) => `- ${t.theme} (${t.count})`)
      : [`- (no themes yet)`]),
  ].join('\n');

  const result = await sendEmailViaMailChannels(apiKey, {
    from: { email: from, name: 'Nova Reports' },
    to: recipients.split(',').map((e) => ({ email: e.trim() })).filter((x) => x.email),
    subject,
    text,
  });

  if (!result.ok) {
    console.error('❌ Daily report email failed', result);
  } else {
    console.log('✅ Daily report email sent');
  }
}
