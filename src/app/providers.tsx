'use client';

import { AuthProvider } from '@/lib/auth-context';
import { SearchProvider } from '@/lib/search-context';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SearchProvider>
        {children}
      </SearchProvider>
    </AuthProvider>
  );
}
