import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MarketDataAgent } from '../src/lib/agents/market-data';
import { Orchestrator } from '../src/lib/agents/orchestrator';
import { callLLM } from '../src/lib/ai/llm';
import db from '../src/lib/db';
import { newId } from '../src/lib/ids';

describe('AI Copilot Live Market Data & Multi-Agent Intelligence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MarketDataAgent & Quote Verification', () => {
    it('retrieves and validates quote snapshot for RELIANCE', async () => {
      const agent = new MarketDataAgent();
      const result = await agent.run({ symbol: 'RELIANCE' });

      expect(result.agentName).toBe('MARKET_DATA');
      expect(result.symbol).toBe('RELIANCE');
      expect(result.quote).toBeDefined();
      expect(result.quote.price).toBeGreaterThan(0);
      expect(['NSE', 'BSE']).toContain(result.quote.exchange);
      expect(['LIVE', 'DELAYED', 'END_OF_DAY', 'CACHED', 'UNAVAILABLE']).toContain(
        result.quote.freshnessStatus
      );
      expect(result.quote.providerTimestamp).toBeDefined();
      expect(result.candles.length).toBeGreaterThanOrEqual(20);
      expect(result.disclaimer).toContain('Never fabricated');
    });

    it('persists verified quote snapshot into market_quotes table', async () => {
      const testQuoteId = newId('mq');
      db.prepare(`
        INSERT INTO market_quotes (
          id, symbol, exchange, price, change, change_percent,
          provider_timestamp, received_at, provider, freshness_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        testQuoteId,
        'TCS',
        'NSE',
        3850.5,
        25.5,
        0.67,
        new Date().toISOString(),
        new Date().toISOString(),
        'TEST_FEED',
        'LIVE'
      );

      const retrieved = db.prepare('SELECT * FROM market_quotes WHERE symbol = ?').get('TCS');
      expect(retrieved).toBeDefined();
      expect(retrieved.symbol).toBe('TCS');
      expect(retrieved.price).toBe(3850.5);
      expect(retrieved.freshness_status).toBe('LIVE');
    });
  });

  describe('Multi-Agent Orchestrator', () => {
    it('executes orchestrator with verified quote card and grounded citations', async () => {
      const orchestrator = new Orchestrator();
      const output = await orchestrator.orchestrate({
        userId: 'test-user-01',
        prompt: 'Analyze RELIANCE technical structure and support levels',
        symbol: 'RELIANCE',
      });

      expect(output.symbolDetected).toBe('RELIANCE');
      expect(output.quoteSnapshot).toBeDefined();
      expect(output.quoteSnapshot?.price).toBeGreaterThan(0);
      expect(output.agentReports.tech).toBeDefined();
      expect(output.agentReports.fundamental).toBeDefined();
      expect(output.agentReports.news).toBeDefined();
      expect(output.agentReports.risk).toBeDefined();
      expect(output.agentReports.marketData).toBeDefined();

      // Verify verdict structure
      expect(['STRONG_BUY', 'BUY', 'NEUTRAL_HOLD', 'SELL', 'STRONG_SELL']).toContain(
        output.verdict.verdict
      );
      expect(output.verdict.confidenceScore).toBeGreaterThanOrEqual(25);
      expect(output.verdict.confidenceScore).toBeLessThanOrEqual(95);

      // Verify required sections in markdown response
      expect(output.response).toContain('MARKET SNAPSHOT');
      expect(output.response).toContain('TECHNICAL ANALYSIS');
      expect(output.response).toContain('NEWS AND FUNDAMENTALS');
      expect(output.response).toContain('RISK ASSESSMENT');
      expect(output.disclaimer).toContain('Paper trading / educational');
    });

    it('detects instrument symbol automatically from query text', async () => {
      const orchestrator = new Orchestrator();
      const output = await orchestrator.orchestrate({
        userId: 'test-user-02',
        prompt: 'What is the risk assessment and trend for TCS today?',
      });

      expect(output.symbolDetected).toBe('TCS');
      expect(output.quoteSnapshot?.symbol).toBe('TCS');
    });
  });

  describe('LLM Service & Grounded Synthesis Fallback', () => {
    it('falls back to deterministic grounded synthesis when no API key is set', async () => {
      const response = await callLLM({
        systemPrompt: 'You are an analyst',
        userPrompt: 'Analyze INFY',
      });

      expect(response).toBeDefined();
      expect(response.model).toBe('maxlith-deterministic-grounded-v1');
      expect(response.tokensUsed).toBeGreaterThan(0);
      expect(response.costUsd).toBe(0);
    });
  });

  describe('Conversation and Message Persistence in Database', () => {
    it('creates, updates, reads, and deletes conversations and messages', () => {
      const convId = newId('conv');
      const userId = 'user-test-db-123';

      // 1. Insert conversation
      db.prepare('INSERT INTO ai_conversations (id, user_id, title) VALUES (?, ?, ?)').run(
        convId,
        userId,
        'RELIANCE Analysis'
      );

      const conv = db.prepare('SELECT * FROM ai_conversations WHERE id = ?').get(convId);
      expect(conv).toBeDefined();
      expect(conv.title).toBe('RELIANCE Analysis');
      expect(conv.user_id).toBe(userId);

      // 2. Insert user message
      const msgUser = newId('msg');
      db.prepare(`
        INSERT INTO ai_messages (id, conversation_id, sender, content)
        VALUES (?, ?, 'USER', ?)
      `).run(msgUser, convId, 'Analyze RELIANCE');

      // 3. Insert assistant message
      const msgAssistant = newId('msg');
      db.prepare(`
        INSERT INTO ai_messages (id, conversation_id, sender, content, agent_data)
        VALUES (?, ?, 'ASSISTANT', ?, ?)
      `).run(msgAssistant, convId, 'RELIANCE is trading at ₹2,980 with RSI 62.', JSON.stringify({ rsi: 62 }));

      // 4. Query messages
      const messages = db.prepare('SELECT * FROM ai_messages WHERE conversation_id = ?').all(convId);
      expect(messages.length).toBe(2);
      expect(messages[0].sender).toBe('USER');
      expect(messages[1].sender).toBe('ASSISTANT');

      // 5. Query user conversations list with last_message
      const convsList = db.prepare('SELECT * FROM ai_conversations WHERE user_id = ?').all(userId);
      expect(convsList.length).toBe(1);
      expect(convsList[0].last_message).toBe('RELIANCE is trading at ₹2,980 with RSI 62.');

      // 6. Delete conversation
      db.prepare('DELETE FROM ai_conversations WHERE id = ? AND user_id = ?').run(convId, userId);
      const afterDelete = db.prepare('SELECT * FROM ai_conversations WHERE id = ?').get(convId);
      expect(afterDelete).toBeNull();
      const messagesAfterDelete = db.prepare('SELECT * FROM ai_messages WHERE conversation_id = ?').all(convId);
      expect(messagesAfterDelete.length).toBe(0);
    });
  });

  describe('Security & Validation Safeguards', () => {
    it('records analysis run in ai_analysis_runs with model metadata', () => {
      const runId = newId('run');
      const userId = 'sec-user-01';

      db.prepare(`
        INSERT INTO ai_analysis_runs (
          id, user_id, symbol, analysis_type, model, source_timestamp, result, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        runId,
        userId,
        'INFY',
        'MULTI_AGENT_SYNTHESIS',
        'gemini-1.5-pro',
        new Date().toISOString(),
        JSON.stringify({ verdict: 'BUY' }),
        'SUCCESS'
      );

      const run = db.prepare('SELECT * FROM ai_analysis_runs WHERE id = ?').get(runId);
      expect(run).toBeDefined();
      expect(run.symbol).toBe('INFY');
      expect(run.model).toBe('gemini-1.5-pro');
      expect(run.status).toBe('SUCCESS');
    });
  });
});

