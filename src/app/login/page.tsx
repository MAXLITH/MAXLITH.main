import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

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
