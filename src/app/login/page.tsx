import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Terminal Access — MAXLITH AI Institutional Quant Trading',
  description: 'Sign in to MAXLITH AI institutional trading terminal for Indian stock markets (NSE/BSE).',
};

export default async function LoginPage() {
  const session = await getAuthSession();
  if (session) {
    redirect('/dashboard');
  }

  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
