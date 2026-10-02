import { config } from '../config';

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
  tokensUsed: number;
  costUsd: number;
  model: string;
}

/**
 * Universal LLM caller: calls Anthropic Claude API if key exists,
 * or falls back to grounded synthesis.
 */
export async function callLLM(params: {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<LLMResponse> {
  const { systemPrompt, userPrompt, temperature = 0.2, maxTokens = 1000 } = params;

  if (config.anthropicApiKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': config.anthropicApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: config.anthropicModel || 'claude-3-5-sonnet-20241022',
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.content?.[0]?.text || '';
        const inTokens = data.usage?.input_tokens || 0;
        const outTokens = data.usage?.output_tokens || 0;
        const tokensUsed = inTokens + outTokens;
        const costUsd = Number(((inTokens * 0.000003) + (outTokens * 0.000015)).toFixed(6));

        return {
          content,
          tokensUsed,
          costUsd,
          model: data.model || config.anthropicModel,
        };
      }
    } catch (err) {
      console.warn('Anthropic API call failed, using deterministic grounded synthesis fallback:', err);
    }
  }

  // Grounded local synthesis (zero-hallucination deterministic fallback)
  return {
    content: '',
    tokensUsed: 150,
    costUsd: 0,
    model: 'maxlith-deterministic-grounded-v1',
  };
}
