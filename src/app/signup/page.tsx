import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import SignupForm from './SignupForm';

export const dynamic = 'force-dynamic';

export default async function SignupPage() {
  const session = await getAuthSession();
  if (session) {
    redirect('/dashboard');
  }

  return <SignupForm />;
}
