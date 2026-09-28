import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-[#0b0e14]">
      {/* Persistent Left Sidebar */}
      <Sidebar user={session} />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={session} />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
