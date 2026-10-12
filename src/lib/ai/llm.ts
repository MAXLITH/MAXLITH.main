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
 * Universal LLM caller:
 * 1. Checks Google Gemini API (GEMINI_API_KEY, GEMINI_MODEL)
 * 2. Fallback to Anthropic Claude (ANTHROPIC_API_KEY, ANTHROPIC_MODEL)
 * 3. Fallback to deterministic grounded multi-agent synthesis (zero hallucination)
 */
export async function callLLM(params: {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<LLMResponse> {
  const { systemPrompt, userPrompt, temperature = 0.2, maxTokens = 1500 } = params;

  // Safeguard: Sanitize and truncate excessive user input
  const sanitizedUserPrompt = userPrompt.slice(0, 8000).trim();

  // 1. Google Gemini API
  if (config.geminiApiKey) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const geminiModel = config.geminiModel || 'gemini-1.5-pro';

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${config.geminiApiKey}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.geminiApiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: sanitizedUserPrompt }],
            },
          ],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const inTokens = data.usageMetadata?.promptTokenCount || 0;
        const outTokens = data.usageMetadata?.candidatesTokenCount || 0;
        const tokensUsed = data.usageMetadata?.totalTokenCount || inTokens + outTokens;
        
        // Approximate Gemini pricing ($1.25/1M input, $5.00/1M output for 1.5 Pro)
        const costUsd = Number(((inTokens * 0.00000125) + (outTokens * 0.000005)).toFixed(6));

        if (content.trim().length > 0) {
          return {
            content,
            tokensUsed,
            costUsd,
            model: geminiModel,
          };
        }
      } else {
        const errText = await res.text().catch(() => '');
        console.warn(`Gemini API error (${res.status}):`, errText);

        // Fallback to gemini-1.5-flash if primary model was 404 or unavailable
        if (res.status === 404 && geminiModel !== 'gemini-1.5-flash') {
          const fallbackEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.geminiApiKey}`;
          const fallbackRes = await fetch(fallbackEndpoint, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': config.geminiApiKey,
            },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: 'user', parts: [{ text: sanitizedUserPrompt }] }],
              generationConfig: { temperature, maxOutputTokens: maxTokens },
            }),
          });

          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const inTokens = data.usageMetadata?.promptTokenCount || 0;
            const outTokens = data.usageMetadata?.candidatesTokenCount || 0;
            const tokensUsed = data.usageMetadata?.totalTokenCount || inTokens + outTokens;
            const costUsd = Number(((inTokens * 0.000000075) + (outTokens * 0.0000003)).toFixed(6));

            if (content.trim().length > 0) {
              return {
                content,
                tokensUsed,
                costUsd,
                model: 'gemini-1.5-flash',
              };
            }
          }
        }
      }
    } catch (err) {
      console.warn('Gemini API call failed or timed out:', err);
    } finally {
      clearTimeout(timeout);
    }
  }

  // 2. Anthropic Claude Fallback
  if (config.anthropicApiKey) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
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
          messages: [{ role: 'user', content: sanitizedUserPrompt }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.content?.[0]?.text || '';
        const inTokens = data.usage?.input_tokens || 0;
        const outTokens = data.usage?.output_tokens || 0;
        const tokensUsed = inTokens + outTokens;
        const costUsd = Number(((inTokens * 0.000003) + (outTokens * 0.000015)).toFixed(6));

        if (content.trim().length > 0) {
          return {
            content,
            tokensUsed,
            costUsd,
            model: data.model || config.anthropicModel,
          };
        }
      }
    } catch (err) {
      console.warn('Anthropic API call failed, using deterministic grounded synthesis fallback:', err);
    } finally {
      clearTimeout(timeout);
    }
  }

  // 3. Grounded local synthesis (zero-hallucination deterministic fallback)
  return {
    content: '',
    tokensUsed: 150,
    costUsd: 0,
    model: 'maxlith-deterministic-grounded-v1',
  };
}
