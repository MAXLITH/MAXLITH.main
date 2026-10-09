import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import AdminLoginForm from './AdminLoginForm';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  const session = await getAuthSession();
  
  // If already authenticated as ADMIN, redirect directly to dashboard
  if (session?.role === 'ADMIN') {
    redirect('/admin/dashboard');
  }

  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}
