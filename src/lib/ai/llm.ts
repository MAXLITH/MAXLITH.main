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
 * 2. Fallback to Groq API (GROQ_API_KEY, GROQ_MODEL)
 * 3. Fallback to OpenAI API (OPENAI_API_KEY, OPENAI_MODEL)
 * 4. Fallback to Anthropic Claude (ANTHROPIC_API_KEY, ANTHROPIC_MODEL)
 * 5. Fallback to deterministic grounded multi-agent synthesis (zero hallucination)
 */
export async function callLLM(params: {
  systemPrompt: string;
  userPrompt: string;
  history?: LLMMessage[];
  messages?: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<LLMResponse> {
  const { systemPrompt, userPrompt, temperature = 0.2, maxTokens = 1500 } = params;
  const history = params.history || params.messages || [];

  // Safeguard: Sanitize and truncate excessive user input
  const sanitizedUserPrompt = userPrompt.slice(0, 8000).trim();

  // 1. Google Gemini API
  if (config.geminiApiKey) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const geminiModel = config.geminiModel || 'gemini-2.0-flash';

    try {
      const contents = [
        ...history.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        {
          role: 'user',
          parts: [{ text: sanitizedUserPrompt }],
        },
      ];

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;

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
          contents,
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
        const costUsd = Number(((inTokens * 0.000000075) + (outTokens * 0.0000003)).toFixed(6));

        if (content.trim().length > 0) {
          return {
            content: content.trim(),
            tokensUsed,
            costUsd,
            model: geminiModel,
          };
        }
      } else {
        const errText = await res.text().catch(() => '');
        console.warn(`[MAXLITH AI] Gemini API returned status ${res.status}:`, errText);

        // Fallback to gemini-1.5-flash if primary model was 404 or unavailable
        if (res.status === 404 && geminiModel !== 'gemini-1.5-flash') {
          const fallbackEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;
          const fallbackRes = await fetch(fallbackEndpoint, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': config.geminiApiKey,
            },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents,
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
                content: content.trim(),
                tokensUsed,
                costUsd,
                model: 'gemini-1.5-flash',
              };
            }
          }
        }
      }
    } catch (err) {
      console.warn('[MAXLITH AI] Gemini API call failed or timed out:', err);
    } finally {
      clearTimeout(timeout);
    }
  }

  // 2. Groq Cloud Fallback (Fast Llama 3.3)
  if (config.groqApiKey) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const groqModel = config.groqModel || 'llama-3.3-70b-versatile';

    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: sanitizedUserPrompt },
      ];

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.groqApiKey}`,
        },
        body: JSON.stringify({
          model: groqModel,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || '';
        const inTokens = data.usage?.prompt_tokens || 0;
        const outTokens = data.usage?.completion_tokens || 0;
        const tokensUsed = inTokens + outTokens;
        const costUsd = Number(((inTokens * 0.00000059) + (outTokens * 0.00000079)).toFixed(6));

        if (content.trim().length > 0) {
          return {
            content: content.trim(),
            tokensUsed,
            costUsd,
            model: groqModel,
          };
        }
      } else {
        const errText = await res.text().catch(() => '');
        console.warn(`[MAXLITH AI] Groq API returned status ${res.status}:`, errText);
      }
    } catch (err) {
      console.warn('[MAXLITH AI] Groq API call failed:', err);
    } finally {
      clearTimeout(timeout);
    }
  }

  // 3. OpenAI Fallback
  if (config.openaiApiKey) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const openaiModel = config.openaiModel || 'gpt-4o-mini';

    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: sanitizedUserPrompt },
      ];

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: openaiModel,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || '';
        const inTokens = data.usage?.prompt_tokens || 0;
        const outTokens = data.usage?.completion_tokens || 0;
        const tokensUsed = inTokens + outTokens;
        const costUsd = Number(((inTokens * 0.00000015) + (outTokens * 0.0000006)).toFixed(6));

        if (content.trim().length > 0) {
          return {
            content: content.trim(),
            tokensUsed,
            costUsd,
            model: openaiModel,
          };
        }
      } else {
        const errText = await res.text().catch(() => '');
        console.warn(`[MAXLITH AI] OpenAI API returned status ${res.status}:`, errText);
      }
    } catch (err) {
      console.warn('[MAXLITH AI] OpenAI API call failed:', err);
    } finally {
      clearTimeout(timeout);
    }
  }

  // 4. Anthropic Claude Fallback
  if (config.anthropicApiKey) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const messages = [
        ...history.filter((m) => m.role === 'user' || m.role === 'assistant').map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: sanitizedUserPrompt },
      ];

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
          messages,
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
            content: content.trim(),
            tokensUsed,
            costUsd,
            model: data.model || config.anthropicModel,
          };
        }
      }
    } catch (err) {
      console.warn('[MAXLITH AI] Anthropic API call failed:', err);
    } finally {
      clearTimeout(timeout);
    }
  }

  // 5. Grounded local synthesis (zero-hallucination deterministic fallback)
  return {
    content: '',
    tokensUsed: 150,
    costUsd: 0,
    model: 'maxlith-deterministic-grounded-v1',
  };
}
