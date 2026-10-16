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

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const isExplicitAction = params?.mode === 'signup' || params?.switch === 'true';
  const session = await getAuthSession();

  if (session && !isExplicitAction) {
    redirect('/dashboard');
  }

  return (
    <Suspense fallback={null}>
      <LoginForm initialMode={params?.mode === 'signup' ? 'signup' : 'login'} />
    </Suspense>
  );
}
