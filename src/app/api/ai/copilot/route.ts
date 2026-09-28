import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { runAIOrchestrator } from '@/lib/ai';

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    const userId = session ? session.id : 'guest-user';

    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    const result = runAIOrchestrator(userId, prompt);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('AI Copilot error', error);
    return NextResponse.json({ error: 'AI Orchestration failed to execute.' }, { status: 500 });
  }
}
