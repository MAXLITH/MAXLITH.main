import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { TechAgent, NewsAgent, RiskAgent, FundamentalAgent, InfoAgent } from '@/lib/agents';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const agentsList = ['TECH', 'NEWS', 'RISK', 'FUNDAMENTAL', 'INFO'];
    const statusResults = [];

    for (const agentName of agentsList) {
      const lastRun = db.prepare(`
        SELECT * FROM ai_agent_runs 
        WHERE agent_name = ? 
        ORDER BY created_at DESC 
        LIMIT 1
      `).get(agentName) as any;

      const runsCount = (db.prepare('SELECT COUNT(*) as count FROM ai_agent_runs WHERE agent_name = ?').get(agentName) as any)?.count || 0;

      statusResults.push({
        name: agentName,
        status: 'OPERATIONAL',
        lastRunAt: lastRun ? lastRun.created_at : null,
        totalRuns: runsCount,
        lastExecutionMs: lastRun ? lastRun.execution_time_ms : null,
        lastOutput: lastRun ? (lastRun.output?.startsWith('{') ? JSON.parse(lastRun.output) : lastRun.output) : null,
      });
    }

    return NextResponse.json({ agents: statusResults });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch agents status' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    const userId = session ? session.id : 'guest-user';

    const body = await request.json();
    const { agent, symbol = 'RELIANCE' } = body;

    const symUpper = symbol.toUpperCase().trim();
    let result: any;

    switch (agent) {
      case 'TECH': {
        const a = new TechAgent();
        result = await a.run({ userId, symbol: symUpper });
        break;
      }
      case 'NEWS': {
        const a = new NewsAgent();
        result = await a.run({ userId, symbol: symUpper });
        break;
      }
      case 'RISK': {
        const a = new RiskAgent();
        result = await a.run({ userId, symbol: symUpper });
        break;
      }
      case 'FUNDAMENTAL': {
        const a = new FundamentalAgent();
        result = await a.run({ userId, symbol: symUpper });
        break;
      }
      case 'INFO': {
        const a = new InfoAgent();
        result = await a.run({ userId, symbol: symUpper });
        break;
      }
      default:
        return NextResponse.json({ error: `Unknown agent: ${agent}. Must be TECH, NEWS, RISK, FUNDAMENTAL, or INFO.` }, { status: 400 });
    }

    return NextResponse.json({ success: true, agent, symbol: symUpper, data: result });
  } catch (error: any) {
    console.error('Agent execution error', error);
    return NextResponse.json({ error: error.message || 'Agent run failed' }, { status: 500 });
  }
}
