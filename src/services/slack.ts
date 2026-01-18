export async function sendSlackDigest(
  webhookUrl: string,
  summaryData: {
    totalCount: number;
    countsBySentiment: Record<string, number>;
    topThemes: Array<{ theme: string; count: number }>;
    recentFeedback: Array<{
      id: number;
      text: string;
      sentiment: string | null;
      urgency: number | null;
    }>;
  }
): Promise<boolean> {
  try {
    const topThemesText = summaryData.topThemes
      .slice(0, 5)
      .map((t, i) => `${i + 1}. ${t.theme} (${t.count})`)
      .join('\n');
    
    const negativeItems = summaryData.recentFeedback
      .filter(f => f.sentiment === 'negative')
      .slice(0, 5)
      .map(f => `• [ID:${f.id}] ${f.text.substring(0, 100)}${f.text.length > 100 ? '...' : ''}`)
      .join('\n');
    
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📊 Daily Feedback Digest',
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Total Feedback:* ${summaryData.totalCount}`,
          },
          {
            type: 'mrkdwn',
            text: `*Positive:* ${summaryData.countsBySentiment.positive || 0}`,
          },
          {
            type: 'mrkdwn',
            text: `*Neutral:* ${summaryData.countsBySentiment.neutral || 0}`,
          },
          {
            type: 'mrkdwn',
            text: `*Negative:* ${summaryData.countsBySentiment.negative || 0}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Top Themes:*\n${topThemesText || 'None yet'}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Recent Negative Feedback:*\n${negativeItems || 'None'}`,
        },
      },
    ];
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ blocks }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Slack webhook error:', error);
    return false;
  }
}