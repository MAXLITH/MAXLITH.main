import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { orchestrator } from '@/lib/agents';
import db from '@/lib/db';
import { newId } from '@/lib/ids';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversations = db.prepare(`
      SELECT c.*, 
        (SELECT content FROM ai_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM ai_conversations c
      WHERE c.user_id = ?
      ORDER BY c.updated_at DESC
      LIMIT 10
    `).all(session.id);

    return NextResponse.json({ conversations });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch conversation history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    const userId = session ? session.id : 'guest-user';

    const body = await request.json();
    const { prompt, symbol, conversationId } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    const result = await orchestrator.orchestrate({
      userId,
      prompt,
      symbol,
    });

    // Persist conversation if logged in
    if (session) {
      try {
        let convId = conversationId;
        if (!convId) {
          convId = newId('conv');
          const title = prompt.length > 40 ? prompt.substring(0, 40) + '...' : prompt;
          db.prepare('INSERT INTO ai_conversations (id, user_id, title) VALUES (?, ?, ?)').run(convId, session.id, title);
        } else {
          db.prepare('UPDATE ai_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(convId);
        }

        // Insert user message
        db.prepare(`
          INSERT INTO ai_messages (id, conversation_id, sender, content, created_at)
          VALUES (?, ?, 'USER', ?, CURRENT_TIMESTAMP)
        `).run(newId('msg'), convId, prompt);

        // Insert assistant message
        db.prepare(`
          INSERT INTO ai_messages (id, conversation_id, sender, content, agent_data, created_at)
          VALUES (?, ?, 'ASSISTANT', ?, ?, CURRENT_TIMESTAMP)
        `).run(newId('msg'), convId, result.response, JSON.stringify(result.agentReports));
      } catch (err) {
        console.error('Failed to persist conversation history', err);
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('AI Copilot error', error);
    return NextResponse.json({ error: 'AI Orchestration failed to execute.' }, { status: 500 });
    return NextResponse.json({ error: error.message || 'AI Orchestration failed to execute.' }, { status: 500 });
  }
}
