-- Migration: AI Copilot Multi-Agent Intelligence and Live Market Quotes Schema
-- MAXLITH V1 Paper Trading Platform

CREATE TABLE IF NOT EXISTS ai_conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Market Analysis',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('USER', 'ASSISTANT', 'SYSTEM')),
    content TEXT NOT NULL,
    agent_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON ai_messages(conversation_id, created_at ASC);

CREATE TABLE IF NOT EXISTS market_quotes (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    exchange TEXT NOT NULL DEFAULT 'NSE',
    price NUMERIC(12, 2) NOT NULL,
    change NUMERIC(12, 2) NOT NULL DEFAULT 0,
    change_percent NUMERIC(8, 4) NOT NULL DEFAULT 0,
    provider_timestamp TIMESTAMPTZ,
    received_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    provider TEXT NOT NULL,
    freshness_status TEXT NOT NULL CHECK (freshness_status IN ('LIVE', 'DELAYED', 'END_OF_DAY', 'CACHED', 'UNAVAILABLE'))
);

CREATE INDEX IF NOT EXISTS idx_market_quotes_symbol ON market_quotes(symbol, received_at DESC);

CREATE TABLE IF NOT EXISTS ai_analysis_runs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    symbol TEXT NOT NULL,
    analysis_type TEXT NOT NULL DEFAULT 'MULTI_AGENT_SYNTHESIS',
    model TEXT NOT NULL,
    source_timestamp TIMESTAMPTZ,
    result JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'SUCCESS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_runs_user ON ai_analysis_runs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_runs_symbol ON ai_analysis_runs(symbol, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_runs ENABLE ROW LEVEL SECURITY;

-- Conversations RLS: users can only see & modify their own conversations
CREATE POLICY "Users access own ai_conversations" ON ai_conversations
    FOR ALL USING (auth.uid()::text = user_id);

-- Messages RLS: users can only see & modify messages from their own conversations
CREATE POLICY "Users access own ai_messages" ON ai_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM ai_conversations
            WHERE ai_conversations.id = ai_messages.conversation_id
            AND ai_conversations.user_id = auth.uid()::text
        )
    );

-- Market Quotes: readable by all authenticated and anonymous readers, writable only by service role
CREATE POLICY "Allow public read access to market quotes" ON market_quotes
    FOR SELECT USING (true);

-- Analysis Runs: readable by the owner
CREATE POLICY "Users access own analysis runs" ON ai_analysis_runs
    FOR ALL USING (auth.uid()::text = user_id OR user_id IS NULL);

