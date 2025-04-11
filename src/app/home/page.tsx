'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication and redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated') {
      setIsLoading(false);
    }
    // Set a timeout to avoid infinite loading state
    const timer = setTimeout(() => {
      if (status === 'loading') {
        setError('Session loading timeout. Please try logging in again.');
        router.push('/?error=session_timeout');
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [status, router]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-900 to-black">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-zinc-900 to-black">
      <div className="w-full max-w-4xl p-8 bg-zinc-800 rounded-xl shadow-xl">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-4xl font-bold text-white mb-6">Welcome to VibeSmiths</h1>

          <p className="text-xl text-zinc-300 mb-8">Your Spotify music playground is ready!</p>

          {error && (
            <div className="p-3 mb-6 bg-red-900/40 border border-red-700 rounded-md text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mb-8">
            <div className="bg-zinc-700 p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold text-white mb-3">Your Library</h2>
              <p className="text-zinc-300 mb-4">Import and manage your Spotify liked tracks.</p>
              <Link href="/dashboard">
                <Button variant="spotify" fullWidth>
                  Go to Dashboard
                </Button>
              </Link>
            </div>

            <div className="bg-zinc-700 p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold text-white mb-3">The Chat</h2>
              <p className="text-zinc-300 mb-4">
                Chat with other music lovers about tracks and playlists.
              </p>
              <Link href="/chat">
                <Button variant="spotify" fullWidth>
                  Join The Chat
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <p className="text-sm text-zinc-400 mb-4">
              Signed in as: <span className="font-semibold">{session?.user?.name || 'User'}</span>
            </p>

            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
