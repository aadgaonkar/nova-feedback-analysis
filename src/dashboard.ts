export const dashboardHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feedback Analysis Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: #f5f5f7;
      color: #1d1d1f;
      padding: 20px;
      line-height: 1.6;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    
    header {
      background: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    h1 {
      font-size: 32px;
      margin-bottom: 10px;
    }
    
    .subtitle {
      color: #86868b;
      font-size: 14px;
    }
    
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .kpi-card {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .kpi-label {
      font-size: 14px;
      color: #86868b;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .kpi-value {
      font-size: 36px;
      font-weight: 600;
      color: #1d1d1f;
    }
    
    .kpi-value.positive { color: #30d158; }
    .kpi-value.neutral { color: #ff9f0a; }
    .kpi-value.negative { color: #ff453a; }
    
    .actions {
      background: white;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    button {
      background: #0071e3;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    button:hover {
      background: #0077ed;
    }
    
    button:disabled {
      background: #86868b;
      cursor: not-allowed;
    }
    
    .themes-section {
      background: white;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .themes-list {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 16px;
    }
    
    .theme-tag {
      background: #f5f5f7;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .theme-count {
      background: #0071e3;
      color: white;
      border-radius: 12px;
      padding: 2px 8px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .feedback-table {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    thead {
      background: #f5f5f7;
    }
    
    th {
      padding: 16px;
      text-align: left;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #86868b;
    }
    
    td {
      padding: 16px;
      border-top: 1px solid #f5f5f7;
      font-size: 14px;
    }
    
    .sentiment-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .sentiment-positive {
      background: #d1f2df;
      color: #1d7a3c;
    }
    
    .sentiment-neutral {
      background: #ffe6cc;
      color: #b8620d;
    }
    
    .sentiment-negative {
      background: #ffd6d6;
      color: #c21717;
    }
    
    .urgency-badge {
      display: inline-block;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      text-align: center;
      line-height: 24px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .urgency-1 { background: #30d158; color: white; }
    .urgency-2 { background: #64d2ff; color: white; }
    .urgency-3 { background: #ff9f0a; color: white; }
    .urgency-4 { background: #ff453a; color: white; }
    .urgency-5 { background: #bf5af2; color: white; }
    
    .loading {
      text-align: center;
      padding: 40px;
      color: #86868b;
    }
    
    .error {
      background: #ffd6d6;
      color: #c21717;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .text-truncate {
      max-width: 400px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .timestamp {
      color: #86868b;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📊 Feedback Analysis Dashboard</h1>
      <p class="subtitle">NovaSearch User Feedback Insights</p>
    </header>
    
    <div id="loading" class="loading">Loading data...</div>
    <div id="error" class="error" style="display: none;"></div>
    
    <div id="content" style="display: none;">
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total Feedback</div>
          <div class="kpi-value" id="kpi-total">0</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Positive</div>
          <div class="kpi-value positive" id="kpi-positive">0</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Neutral</div>
          <div class="kpi-value neutral" id="kpi-neutral">0</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Negative</div>
          <div class="kpi-value negative" id="kpi-negative">0</div>
        </div>
      </div>
      
      <div class="actions">
        <button id="btn-analyze" onclick="runAnalysis()">🔍 Run Analysis (25 pending items)</button>
        <span id="analyze-status" style="margin-left: 12px; color: #86868b;"></span>
      </div>
      
      <div class="themes-section">
        <h2>Top Themes</h2>
        <div class="themes-list" id="themes-list"></div>
      </div>
      
      <div class="feedback-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Source</th>
              <th>Text</th>
              <th>Sentiment</th>
              <th>Themes</th>
              <th>Urgency</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody id="feedback-tbody"></tbody>
        </table>
      </div>
    </div>
  </div>
  
  <script>
    async function loadSummary() {
      try {
        const response = await fetch('/api/summary');
        const result = await response.json();
        
        if (!result.ok) {
          throw new Error(result.error || 'Failed to load data');
        }
        
        const data = result.data;
        
        // Update KPIs
        document.getElementById('kpi-total').textContent = data.totalCount;
        document.getElementById('kpi-positive').textContent = data.countsBySentiment.positive || 0;
        document.getElementById('kpi-neutral').textContent = data.countsBySentiment.neutral || 0;
        document.getElementById('kpi-negative').textContent = data.countsBySentiment.negative || 0;
        
        // Update themes
        const themesList = document.getElementById('themes-list');
        themesList.innerHTML = data.topThemes.map(t => 
          \`<div class="theme-tag">
            <span>\${t.theme}</span>
            <span class="theme-count">\${t.count}</span>
          </div>\`
        ).join('');
        
        // Update feedback table
        const tbody = document.getElementById('feedback-tbody');
        tbody.innerHTML = data.recentFeedback.map(f => {
          const sentimentClass = f.sentiment ? 'sentiment-' + f.sentiment : '';
          const sentimentBadge = f.sentiment 
            ? \`<span class="sentiment-badge \${sentimentClass}">\${f.sentiment}</span>\`
            : '<span style="color: #86868b;">Pending</span>';
          
          const themes = f.themes && Array.isArray(f.themes) 
            ? f.themes.join(', ') 
            : (f.themes || '—');
          
          const urgency = f.urgency 
            ? \`<span class="urgency-badge urgency-\${f.urgency}">\${f.urgency}</span>\`
            : '—';
          
          const summary = f.summary || '—';
          const date = new Date(f.timestamp).toLocaleDateString();
          
          return \`
            <tr>
              <td>\${f.id}</td>
              <td>\${f.source}</td>
              <td class="text-truncate" title="\${f.text}">\${f.text}</td>
              <td>\${sentimentBadge}</td>
              <td>\${themes}</td>
              <td>\${urgency}</td>
              <td>\${summary}</td>
            </tr>
          \`;
        }).join('');
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';
      } catch (error) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        document.getElementById('error').textContent = 'Error: ' + error.message;
      }
    }
    
    async function runAnalysis() {
      const btn = document.getElementById('btn-analyze');
      const status = document.getElementById('analyze-status');
      
      btn.disabled = true;
      status.textContent = 'Running analysis...';
      
      try {
        const response = await fetch('/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'pending', limit: 25 })
        });
        
        const result = await response.json();
        
        if (!result.ok) {
          throw new Error(result.error || 'Analysis failed');
        }
        
        status.textContent = \`✓ Analyzed \${result.data.analyzed} items\`;
        
        // Reload summary after analysis
        setTimeout(loadSummary, 1000);
      } catch (error) {
        status.textContent = 'Error: ' + error.message;
        status.style.color = '#ff453a';
      } finally {
        setTimeout(() => {
          btn.disabled = false;
          status.textContent = '';
        }, 3000);
      }
    }
    
    // Load data on page load
    loadSummary();
    
    // Auto-refresh every 30 seconds
    setInterval(loadSummary, 30000);
  </script>
</body>
</html>`;
