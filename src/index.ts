import type { Env } from './types';
import { handleCors, successResponse, errorResponse } from './services/response';
import { insertFeedback, getPendingFeedback, getFeedbackById, insertAnalysis, getSummaryData, type FeedbackRaw } from './services/db';
import { analyzeFeedback } from './services/ai';
import { sendSlackDigest } from './services/slack';
import { dashboardHTML } from './dashboard';

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
        const body = await request.json() as Partial<FeedbackRaw>;
        
        if (!body.text || !body.source || !body.timestamp) {
          return errorResponse('Missing required fields: text, source, timestamp');
        }

        const id = await insertFeedback(env.DB, body as FeedbackRaw);
        return successResponse({ id });
      }

      // POST /analyze - Analyze feedback
      if (path === '/analyze' && method === 'POST') {
        const body = await request.json() as { mode?: string; id?: number; limit?: number };
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
            feedback_id: feedback.id!,
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

      return errorResponse('Not found', 404);
    } catch (error) {
      console.error('Error:', error);
      return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500);
    }
  },
};
