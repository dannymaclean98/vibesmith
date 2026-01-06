'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { GameContainer } from '@/components/game/GameContainer';

export default function GamePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login?redirect=/game');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <main className="min-h-screen px-4 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-zinc-400">Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Who Sent It? 🎵
          </h1>
          <p className="text-zinc-400">
            Guess which crew member shared each track
          </p>
        </div>

        {/* Game */}
        <GameContainer />
      </div>
    </main>
  );
}

