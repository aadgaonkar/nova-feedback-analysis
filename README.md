# NovaSearch Feedback Analysis System

A complete Cloudflare Workers-based system for ingesting, analyzing, and visualizing user feedback using AI-powered sentiment analysis.

## Overview

This project provides:
- **Multi-source feedback ingestion** - Accept feedback from various sources (Twitter, Discord, email, support tickets, etc.)
- **AI-powered analysis** - Automatically analyze feedback using Cloudflare Workers AI to extract sentiment, themes, urgency, and summaries
- **Interactive dashboard** - Real-time dashboard showing KPIs, top themes, and recent feedback with analysis
- **Slack integration** - Optional webhook integration for daily digests

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **AI**: Cloudflare Workers AI
- **Language**: TypeScript
- **Deployment**: Wrangler CLI

## Project Structure

```
nova-feedback-analysis/
├── src/
│   ├── index.ts              # Main worker entry point with routing
│   ├── types.ts              # TypeScript type definitions
│   ├── dashboard.ts          # HTML dashboard template
│   └── services/
│       ├── db.ts             # Database operations
│       ├── ai.ts             # AI analysis service
│       ├── response.ts       # HTTP response helpers
│       └── slack.ts          # Slack webhook integration
├── scripts/
│   └── ingest_csv.ts         # CSV ingestion script
├── schema/
│   └── d1.sql                # Database schema
├── data/
│   └── nova_search_multisource_feedback.csv  # Seed data
├── wrangler.toml             # Cloudflare Workers configuration
├── package.json
└── tsconfig.json
```

## Setup & Installation

### Prerequisites

- Node.js 18+ installed
- Cloudflare account
- Wrangler CLI installed: `npm install -g wrangler`
- Cloudflare account logged in: `wrangler login`

### 1. Install Dependencies

```bash
npm install
```

### 2. Create D1 Database

```bash
# Create a new D1 database
wrangler d1 create feedback-db

# Copy the database_id from the output and update wrangler.toml
```

### 3. Update wrangler.toml

Edit `wrangler.toml` and replace `YOUR_DATABASE_ID` with the actual database ID from step 2:

```toml
[[d1_databases]]
binding = "DB"
database_name = "feedback-db"
database_id = "your-actual-database-id-here"
```

### 4. Apply Database Schema

```bash
npm run db:apply
```

Or manually:

```bash
wrangler d1 execute DB --file=./schema/d1.sql
```

### 5. (Optional) Configure Slack Webhook

If you want Slack notifications, uncomment and set the `SLACK_WEBHOOK_URL` in `wrangler.toml`:

```toml
[vars]
SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

## Local Development

### Start Development Server

```bash
npm run dev
```

This starts Wrangler in development mode at `http://localhost:8787`.

### Ingest CSV Data

Once your dev server is running, ingest the seed CSV data:

```bash
npm run ingest:csv
```

Or with a custom API URL:

```bash
API_URL=https://your-worker.your-subdomain.workers.dev npm run ingest:csv
```

You can also pass the URL as an argument:

```bash
tsx scripts/ingest_csv.ts https://your-worker.your-subdomain.workers.dev
```

## Deployment

### Deploy to Cloudflare Workers

```bash
npm run deploy
```

After deployment, update your ingestion command to use the deployed URL:

```bash
API_URL=https://nova-feedback-analysis.your-subdomain.workers.dev npm run ingest:csv
```

## API Endpoints

### POST /feedback

Ingest a new feedback item.

**Request Body:**
```json
{
  "product": "NovaSearch",
  "text": "The UI is great!",
  "source": "twitter",
  "timestamp": "2025-01-15T10:00:00Z",
  "user_segment": "pro",
  "region": "NA",
  "area": "ui_ux",
  "rating": 5
}
```

**Required fields**: `text`, `source`, `timestamp`

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": 1
  }
}
```

### POST /analyze

Analyze feedback using Workers AI.

**Request Body Options:**

Analyze pending items:
```json
{
  "mode": "pending",
  "limit": 25
}
```

Analyze specific feedback by ID:
```json
{
  "id": 123
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "analyzed": 5,
    "results": [
      {
        "feedback_id": 1,
        "analysis_id": 1,
        "sentiment": "positive",
        "themes": ["UI/UX", "Performance"],
        "summary": "User appreciates the clean interface.",
        "urgency": 2,
        "model_version": "v1.0"
      }
    ]
  }
}
```

### GET /api/summary

Get aggregated dashboard data.

**Response:**
```json
{
  "ok": true,
  "data": {
    "totalCount": 81,
    "countsBySource": {
      "twitter": 15,
      "email": 10,
      "support_ticket": 12
    },
    "countsBySentiment": {
      "positive": 25,
      "neutral": 18,
      "negative": 38
    },
    "topThemes": [
      { "theme": "UI/UX", "count": 15 },
      { "theme": "Billing", "count": 12 }
    ],
    "recentFeedback": [...]
  }
}
```

### GET /

Serves the interactive dashboard HTML page.

### POST /notify/slack

Send a Slack digest (requires `SLACK_WEBHOOK_URL` in config).

**Response:**
```json
{
  "ok": true,
  "data": {
    "sent": true
  }
}
```

## Example cURL Commands

### Ingest Feedback

```bash
curl -X POST http://localhost:8787/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Great product!",
    "source": "twitter",
    "timestamp": "2025-01-15T10:00:00Z"
  }'
```

### Analyze Pending Items

```bash
curl -X POST http://localhost:8787/analyze \
  -H "Content-Type: application/json" \
  -d '{"mode": "pending", "limit": 10}'
```

### Get Summary

```bash
curl http://localhost:8787/api/summary
```

### Send Slack Notification

```bash
curl -X POST http://localhost:8787/notify/slack
```

## Database Schema

### feedback_raw

Stores raw feedback data.

- `id` (INTEGER, PRIMARY KEY)
- `product` (TEXT)
- `text` (TEXT, NOT NULL)
- `source` (TEXT, NOT NULL)
- `timestamp` (TEXT, NOT NULL)
- `user_segment` (TEXT)
- `region` (TEXT)
- `area` (TEXT)
- `rating` (INTEGER)
- `created_at` (TEXT)

### feedback_analysis

Stores AI analysis results.

- `id` (INTEGER, PRIMARY KEY)
- `feedback_id` (INTEGER, NOT NULL, FOREIGN KEY)
- `sentiment` (TEXT, NOT NULL) - "positive", "neutral", or "negative"
- `themes` (TEXT, NOT NULL) - JSON array string
- `summary` (TEXT, NOT NULL)
- `urgency` (INTEGER, NOT NULL) - 1-5 scale
- `model_version` (TEXT, NOT NULL)
- `analyzed_at` (TEXT)

## Dashboard Features

- **Real-time KPIs**: Total feedback count, sentiment breakdown
- **Top Themes**: Most frequently mentioned themes across all feedback
- **Feedback Table**: Recent 20 items with full analysis details
- **Run Analysis Button**: Trigger analysis of pending items directly from the dashboard
- **Auto-refresh**: Dashboard refreshes every 30 seconds

## Configuration

### Workers AI Model

Default model is `@cf/meta/llama-3.1-8b-instruct`. You can change it in `wrangler.toml`:

```toml
[vars]
MODEL_NAME = "@cf/meta/llama-3.1-8b-instruct"
```

### CORS

CORS headers are enabled for all endpoints to allow cross-origin requests during development.

## Troubleshooting

### Database Not Found

Make sure you've:
1. Created the D1 database
2. Updated `wrangler.toml` with the correct `database_id`
3. Run `npm run db:apply` to create tables

### AI Analysis Fails

- Check that Workers AI is enabled in your Cloudflare account
- Verify the model name in `wrangler.toml` is correct
- Check the Worker logs in Cloudflare dashboard

### CSV Ingestion Fails

- Ensure the CSV file exists at `data/nova_search_multisource_feedback.csv`
- Check that the worker is running (dev or deployed)
- Verify the API_URL environment variable or argument

## License

MIT
