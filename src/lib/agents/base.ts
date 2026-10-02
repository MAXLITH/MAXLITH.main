import db from '../db';
import { cacheGet, cacheSet } from '../cache';
import { newId } from '../ids';
import { z } from 'zod';

export interface BaseAgentRunParams {
  userId?: string;
  symbol?: string;
  timeframe?: string;
  prompt?: string;
}

export abstract class BaseAgent<TInput extends BaseAgentRunParams, TOutput> {
  abstract readonly name: string;
  abstract readonly systemPrompt: string;
  abstract readonly outputSchema: z.ZodType<TOutput>;

  protected cacheTtlMs: number = 300_000; // 5 minutes default

  protected getCacheKey(input: TInput): string {
    const sym = input.symbol ? input.symbol.toUpperCase() : 'GENERAL';
    const tf = input.timeframe || '1D';
    return `agent:${this.name}:${sym}:${tf}`;
  }

  async run(input: TInput): Promise<TOutput> {
    const cacheKey = this.getCacheKey(input);
    const cached = await cacheGet<TOutput>(cacheKey);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();
    let status: 'SUCCESS' | 'ERROR' = 'SUCCESS';
    let tokensUsed = 0;
    let costUsd = 0;
    let result: TOutput;

    try {
      result = await this.executeWithRetry(input, 2);
      // Validate output structure with Zod
      result = this.outputSchema.parse(result);
      await cacheSet(cacheKey, result, this.cacheTtlMs);
    } catch (err: any) {
      status = 'ERROR';
      console.error(`[AGENT ${this.name}] Execution failed:`, err);
      throw err;
    } finally {
      const executionTimeMs = Date.now() - startTime;
      const userId = input.userId || 'system-orchestrator';
      const promptText = input.prompt || `Analysis for ${input.symbol || 'portfolio'}`;

      try {
        db.prepare(`
          INSERT INTO ai_agent_runs (id, user_id, agent_name, prompt, output, tokens_used, cost_usd, execution_time_ms, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(
          newId('run'),
          userId,
          this.name,
          promptText,
          JSON.stringify(result!),
          tokensUsed || 250,
          costUsd || 0.001,
          executionTimeMs,
          status
        );

        db.prepare(`
          INSERT INTO telemetry_events (kind, name, value, meta, created_at)
          VALUES ('AGENT_RUN', ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(this.name, executionTimeMs, JSON.stringify({ status, tokens: tokensUsed }));
      } catch {
        /* telemetry log error */
      }
    }

    return result;
  }

  private async executeWithRetry(input: TInput, maxRetries: number): Promise<TOutput> {
    let lastError: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.execute(input);
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 300 * Math.pow(2, attempt)));
        }
      }
    }
    throw lastError;
  }

  protected abstract execute(input: TInput): Promise<TOutput>;
}
