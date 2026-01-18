import type { FeedbackAnalysis } from './db';

export interface AIBinding {
  run(model: string, input: { prompt: string; [key: string]: unknown }): Promise<{ response: string }>;
}

const MODEL_VERSION = 'v1.0';

export async function analyzeFeedback(
  ai: AIBinding,
  modelName: string,
  feedbackText: string
): Promise<Omit<FeedbackAnalysis, 'id' | 'feedback_id' | 'analyzed_at'>> {
  const prompt = `Analyze the following user feedback and return ONLY a valid JSON object with no additional text, markdown, or formatting.

Required fields:
- sentiment: must be one of "positive", "neutral", or "negative"
- themes: array of strings, maximum 4 themes (e.g., ["UI/UX", "Performance", "Billing"])
- summary: 1-2 sentence summary of the feedback
- urgency: integer from 1-5 (1=low, 5=critical)

Feedback: "${feedbackText}"

Return JSON in this exact format:
{
  "sentiment": "positive|neutral|negative",
  "themes": ["theme1", "theme2"],
  "summary": "Brief summary here",
  "urgency": 3
}`;

  try {
    const result = await ai.run(modelName, { prompt });
    const responseText = result.response || '';
    
    // Extract JSON from response (handle cases where model adds extra text)
    let jsonText = responseText.trim();
    
    // Try to find JSON object in the response
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    const analysis = JSON.parse(jsonText) as {
      sentiment: string;
      themes: string[];
      summary: string;
      urgency: number;
    };
    
    // Validate and normalize
    if (!['positive', 'neutral', 'negative'].includes(analysis.sentiment)) {
      analysis.sentiment = 'neutral';
    }
    
    if (!Array.isArray(analysis.themes)) {
      analysis.themes = [];
    }
    // Limit to 4 themes
    analysis.themes = analysis.themes.slice(0, 4);
    
    if (typeof analysis.urgency !== 'number' || analysis.urgency < 1 || analysis.urgency > 5) {
      analysis.urgency = Math.max(1, Math.min(5, Math.round(analysis.urgency || 3)));
    }
    
    if (!analysis.summary || typeof analysis.summary !== 'string') {
      analysis.summary = 'Analysis completed.';
    }
    
    return {
      sentiment: analysis.sentiment as 'positive' | 'neutral' | 'negative',
      themes: analysis.themes,
      summary: analysis.summary,
      urgency: analysis.urgency,
      model_version: MODEL_VERSION,
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    
    // Fallback analysis
    return {
      sentiment: 'neutral',
      themes: ['General'],
      summary: 'Analysis failed. Manual review recommended.',
      urgency: 3,
      model_version: MODEL_VERSION,
    };
  }
}