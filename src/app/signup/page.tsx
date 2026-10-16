import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import LoginForm from '../login/LoginForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Open Paper Account — MAXLITH AI Institutional Quant Trading',
  description: 'Create your free MAXLITH AI paper trading account with ₹10,00,000 in virtual capital for Indian stock markets (NSE/BSE).',
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const isExplicitAction = params?.switch === 'true';
  const session = await getAuthSession();

  if (session && !isExplicitAction) {
    redirect('/dashboard');
  }

  return (
    <Suspense fallback={null}>
      <LoginForm initialMode="signup" />
    </Suspense>
  );
}
