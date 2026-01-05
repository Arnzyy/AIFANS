'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-red-500/50 hover:bg-red-500/10 transition-colors text-left"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-red-500/20">
          <LogOut className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <p className="font-medium">{loading ? 'Logging out...' : 'Log Out'}</p>
          <p className="text-sm text-gray-500">Sign out of your account</p>
        </div>
      </div>
    </button>
  );
}
