import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { orchestrator } from '@/lib/agents';
import db from '@/lib/db';
import { newId } from '@/lib/ids';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!session) {
      return NextResponse.json({ conversations: [], messages: [] });
    }

    if (conversationId) {
      const conv = db.prepare('SELECT * FROM ai_conversations WHERE id = ?').get(conversationId);
      if (!conv || conv.user_id !== session.id) {
        return NextResponse.json({ error: 'Conversation not found or access denied.' }, { status: 404 });
      }

      const messages = db.prepare(`
        SELECT * FROM ai_messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
      `).all(conversationId);

      return NextResponse.json({ conversation: conv, messages });
    }

    const conversations = db.prepare(`
      SELECT c.*
      FROM ai_conversations c
      WHERE c.user_id = ?
      ORDER BY c.updated_at DESC
      LIMIT 20
    `).all(session.id);

    return NextResponse.json({ conversations });
  } catch (error: any) {
    console.error('Failed to fetch conversation history:', error);
    return NextResponse.json({ error: 'Failed to fetch conversation history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    const userId = session ? session.id : 'guest-user';

    const body = await request.json();
    const { prompt, symbol, conversationId } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    if (prompt.length > 2000) {
      return NextResponse.json({ error: 'Prompt exceeds maximum length of 2000 characters.' }, { status: 400 });
    }

    const result = await orchestrator.orchestrate({
      userId,
      prompt: prompt.trim(),
      symbol,
    });

    let activeConvId = conversationId;

    // Persist conversation if logged in
    if (session) {
      try {
        if (!activeConvId) {
          activeConvId = newId('conv');
          const title = prompt.length > 40 ? prompt.substring(0, 40) + '...' : prompt;
          db.prepare('INSERT INTO ai_conversations (id, user_id, title) VALUES (?, ?, ?)').run(activeConvId, session.id, title);
        } else {
          db.prepare('UPDATE ai_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(activeConvId);
        }

        // Insert user message
        db.prepare(`
          INSERT INTO ai_messages (id, conversation_id, sender, content, created_at)
          VALUES (?, ?, 'USER', ?, CURRENT_TIMESTAMP)
        `).run(newId('msg'), activeConvId, prompt.trim());

        // Insert assistant message with agent report data
        db.prepare(`
          INSERT INTO ai_messages (id, conversation_id, sender, content, agent_data, created_at)
          VALUES (?, ?, 'ASSISTANT', ?, ?, CURRENT_TIMESTAMP)
        `).run(
          newId('msg'),
          activeConvId,
          result.response,
          JSON.stringify({
            agentReports: result.agentReports,
            quoteSnapshot: result.quoteSnapshot,
            verdict: result.verdict,
          })
        );
      } catch (err) {
        console.error('Failed to persist conversation history:', err);
      }
    }

    return NextResponse.json({
      ...result,
      conversationId: activeConvId,
    });
  } catch (error: any) {
    console.error('AI Copilot error:', error);
    return NextResponse.json(
      { error: error.message || 'AI Orchestration failed to execute.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (conversationId) {
      db.prepare('DELETE FROM AI_CONVERSATIONS WHERE id = ? AND user_id = ?').run(conversationId, session.id);
    } else {
      // Clear all conversations for user
      const userConvs = db.prepare('SELECT id FROM ai_conversations WHERE user_id = ?').all(session.id) as { id: string }[];
      for (const c of userConvs) {
        db.prepare('DELETE FROM AI_CONVERSATIONS WHERE id = ? AND user_id = ?').run(c.id, session.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete conversation:', error);
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
}
