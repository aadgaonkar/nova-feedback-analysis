export interface FeedbackRaw {
  id?: number;
  product?: string;
  text: string;
  source: string;
  timestamp: string;
  user_segment?: string;
  region?: string;
  area?: string;
  rating?: number;
  created_at?: string;
}

export interface FeedbackAnalysis {
  id?: number;
  feedback_id: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  themes: string[];
  summary: string;
  urgency: number;
  model_version: string;
  analyzed_at?: string;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: {
    duration: number;
    rows_read: number;
    rows_written: number;
    last_row_id: number;
  };
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

export async function insertFeedback(db: D1Database, feedback: FeedbackRaw): Promise<number> {
  const stmt = db.prepare(`
    INSERT INTO feedback_raw (product, text, source, timestamp, user_segment, region, area, rating)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = await stmt
    .bind(
      feedback.product || null,
      feedback.text,
      feedback.source,
      feedback.timestamp,
      feedback.user_segment || null,
      feedback.region || null,
      feedback.area || null,
      feedback.rating || null
    )
    .run();
  
  return result.meta.last_row_id;
}

export async function getPendingFeedback(db: D1Database, limit = 25): Promise<FeedbackRaw[]> {
  const stmt = db.prepare(`
    SELECT fr.*
    FROM feedback_raw fr
    LEFT JOIN feedback_analysis fa ON fr.id = fa.feedback_id
    WHERE fa.id IS NULL
    ORDER BY fr.timestamp DESC
    LIMIT ?
  `);
  
  const result = await stmt.bind(limit).all<FeedbackRaw>();
  return result.results;
}

export async function getFeedbackById(db: D1Database, id: number): Promise<FeedbackRaw | null> {
  const stmt = db.prepare('SELECT * FROM feedback_raw WHERE id = ?');
  const result = await stmt.bind(id).first<FeedbackRaw>();
  return result || null;
}

export async function insertAnalysis(db: D1Database, analysis: FeedbackAnalysis): Promise<number> {
  const stmt = db.prepare(`
    INSERT INTO feedback_analysis (feedback_id, sentiment, themes, summary, urgency, model_version)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const result = await stmt
    .bind(
      analysis.feedback_id,
      analysis.sentiment,
      JSON.stringify(analysis.themes),
      analysis.summary,
      analysis.urgency,
      analysis.model_version
    )
    .run();
  
  return result.meta.last_row_id;
}

export async function getAnalysisByFeedbackId(db: D1Database, feedbackId: number): Promise<FeedbackAnalysis | null> {
  const stmt = db.prepare('SELECT * FROM feedback_analysis WHERE feedback_id = ?');
  const result = await stmt.bind(feedbackId).first<FeedbackAnalysis & { themes: string }>();
  
  if (!result) return null;
  
  // Parse themes JSON string
  const themes = typeof result.themes === 'string' ? JSON.parse(result.themes) : result.themes;
  return { ...result, themes } as FeedbackAnalysis;
}

export async function getSummaryData(db: D1Database) {
  // Total feedback count
  const totalResult = await db.prepare('SELECT COUNT(*) as count FROM feedback_raw').first<{ count: number }>();
  const totalCount = totalResult?.count || 0;
  
  // Count by source
  const sourceResult = await db.prepare(`
    SELECT source, COUNT(*) as count
    FROM feedback_raw
    GROUP BY source
    ORDER BY count DESC
  `).all<{ source: string; count: number }>();
  
  const countsBySource: Record<string, number> = {};
  sourceResult.results.forEach(row => {
    countsBySource[row.source] = row.count;
  });
  
  // Count by sentiment (from analysis)
  const sentimentResult = await db.prepare(`
    SELECT sentiment, COUNT(*) as count
    FROM feedback_analysis
    GROUP BY sentiment
  `).all<{ sentiment: string; count: number }>();
  
  const countsBySentiment: Record<string, number> = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };
  sentimentResult.results.forEach(row => {
    countsBySentiment[row.sentiment] = row.count;
  });
  
  // Top themes (count occurrences across all analyses)
  const themesResult = await db.prepare('SELECT themes FROM feedback_analysis').all<{ themes: string }>();
  const themeCounts: Record<string, number> = {};
  
  themesResult.results.forEach(row => {
    const themes = typeof row.themes === 'string' ? JSON.parse(row.themes) : row.themes;
    if (Array.isArray(themes)) {
      themes.forEach((theme: string) => {
        themeCounts[theme] = (themeCounts[theme] || 0) + 1;
      });
    }
  });
  
  const topThemes = Object.entries(themeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([theme, count]) => ({ theme, count }));
  
  // Recent feedback with analysis (last 20)
  const recentResult = await db.prepare(`
    SELECT 
      fr.id,
      fr.source,
      fr.timestamp,
      fr.text,
      fr.product,
      fa.sentiment,
      fa.themes,
      fa.summary,
      fa.urgency
    FROM feedback_raw fr
    LEFT JOIN feedback_analysis fa ON fr.id = fa.feedback_id
    ORDER BY fr.timestamp DESC
    LIMIT 20
  `).all<{
    id: number;
    source: string;
    timestamp: string;
    text: string;
    product?: string;
    sentiment?: string;
    themes?: string;
    summary?: string;
    urgency?: number;
  }>();
  
  const recentFeedback = recentResult.results.map(row => ({
    id: row.id,
    source: row.source,
    timestamp: row.timestamp,
    text: row.text,
    product: row.product,
    sentiment: row.sentiment || null,
    themes: row.themes ? (typeof row.themes === 'string' ? JSON.parse(row.themes) : row.themes) : row.themes,
    summary: row.summary || null,
    urgency: row.urgency || null,
  }));
  
  return {
    totalCount,
    countsBySource,
    countsBySentiment,
    topThemes,
    recentFeedback,
  };
}