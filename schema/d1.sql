-- Feedback raw data table
CREATE TABLE IF NOT EXISTS feedback_raw (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product TEXT,
    text TEXT NOT NULL,
    source TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    user_segment TEXT,
    region TEXT,
    area TEXT,
    rating INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Feedback analysis table
CREATE TABLE IF NOT EXISTS feedback_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feedback_id INTEGER NOT NULL,
    sentiment TEXT NOT NULL,
    themes TEXT NOT NULL,  -- JSON string array
    summary TEXT NOT NULL,
    urgency INTEGER NOT NULL,
    model_version TEXT NOT NULL,
    analyzed_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (feedback_id) REFERENCES feedback_raw(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_analysis_feedback_id ON feedback_analysis(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_raw_timestamp ON feedback_raw(timestamp);
CREATE INDEX IF NOT EXISTS idx_feedback_raw_source ON feedback_raw(source);