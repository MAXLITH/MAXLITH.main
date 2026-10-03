import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer } from 'node:net';
import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SignJWT } from 'jose';
import WebSocket from 'ws';

const secret = 'test-market-stream-secret-with-at-least-32-characters';
const gatewayPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../services/market-stream/server.mjs');
let port = 0;
let child: ChildProcess | undefined;
let baseUrl = '';

async function getFreePort() {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not allocate a test port.');
  const value = address.port;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return value;
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) throw new Error(`Market stream exited with ${child.exitCode}.`);
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return response.json() as Promise<{ status: string; providerConfigured: boolean }>;
    } catch { /* gateway is still starting */ }
    await sleep(50);
  }
  throw new Error('Market stream did not become healthy.');
}

async function signedToken() {
  return new SignJWT({ scope: 'market-stream' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('test-user')
    .setIssuer('maxlith-web')
    .setAudience('market-stream')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(secret));
}

async function waitForMessage(messages: Record<string, unknown>[], predicate: (message: Record<string, unknown>) => boolean) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const message = messages.find(predicate);
    if (message) return message;
    await sleep(25);
  }
  throw new Error('Expected WebSocket frame was not received.');
}

describe('market stream gateway', () => {
  beforeAll(async () => {
    port = await getFreePort();
    baseUrl = `http://127.0.0.1:${port}`;
    child = spawn(process.execPath, [gatewayPath], {
      env: { ...process.env, PORT: String(port), MARKET_STREAM_JWT_SECRET: secret, MARKET_DATA_WS_URL: '', MARKET_STREAM_ALLOWED_ORIGINS: '' },
      stdio: 'ignore',
    });
    await waitForHealth();
  });

  afterAll(async () => {
    if (!child || child.exitCode !== null) return;
    const exited = new Promise<void>((resolve) => child!.once('exit', () => resolve()));
    child.kill('SIGTERM');
    await Promise.race([exited, sleep(1000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  });

  it('reports health without claiming an upstream feed', async () => {
    const status = await waitForHealth();
    expect(status).toEqual({ status: 'ok', providerConfigured: false, activeStreams: 0 });
  });

  it('rejects unauthenticated websocket upgrades', async () => {
    const status = await new Promise<number>((resolve, reject) => {
      const socket = new WebSocket(`ws://127.0.0.1:${port}/ws/market`);
      const timeout = setTimeout(() => reject(new Error('Unauthenticated connection was not rejected.')), 2000);
      socket.on('unexpected-response', (_request, response) => {
        clearTimeout(timeout);
        resolve(response.statusCode || 0);
      });
      socket.on('open', () => { clearTimeout(timeout); reject(new Error('Unauthenticated socket unexpectedly opened.')); });
      socket.on('error', () => {});
    });
    expect(status).toBe(401);
  });

  it('authenticates clients, reports offline upstream state, and answers heartbeats', async () => {
    const token = await signedToken();
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws/market?token=${encodeURIComponent(token)}`);
    const messages: Record<string, unknown>[] = [];
    socket.on('message', (raw) => messages.push(JSON.parse(String(raw)) as Record<string, unknown>));
    try {
      await new Promise<void>((resolve, reject) => {
        socket.once('open', resolve);
        socket.once('error', reject);
      });
      socket.send(JSON.stringify({ action: 'subscribe', symbol: 'NSE:RELIANCE', resolution: '1' }));
      const status = await waitForMessage(messages, (message) => message.type === 'connection_status');
      expect(status.status).toBe('OFFLINE');
      socket.send(JSON.stringify({ action: 'ping', timestamp: Date.now() }));
      const pong = await waitForMessage(messages, (message) => message.type === 'pong');
      expect(pong.type).toBe('pong');
    } finally {
      socket.close();
    }
  });
});
