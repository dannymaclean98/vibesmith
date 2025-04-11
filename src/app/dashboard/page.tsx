'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [isImporting, setIsImporting] = useState(false);
  const [trackCount, setTrackCount] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);

  // Check authentication
  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/');
    }
  }, [status]);

  // Get track count on load
  useEffect(() => {
    if (status === 'authenticated') {
      fetchTrackCount();
    }
  }, [status]);

  // Fetch saved track count
  const fetchTrackCount = async () => {
    try {
      const response = await fetch('/api/tracks/count');
      const data = await response.json();

      if (data.success) {
        setTrackCount(data.count);
      }
    } catch (error) {
      console.error('Error fetching track count:', error);
    }
  };

  // Import tracks from Spotify
  const importTracks = async () => {
    setIsImporting(true);
    setImportError(null);

    try {
      const response = await fetch('/api/tracks/import', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setImportedCount(data.tracksImported);
        fetchTrackCount();
      } else {
        setImportError(data.error || 'Failed to import tracks');
      }
    } catch (error) {
      console.error('Error importing tracks:', error);
      setImportError('An unexpected error occurred');
    } finally {
      setIsImporting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-900 to-black">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gradient-to-b from-zinc-900 to-black">
      <div className="w-full max-w-md p-6 space-y-8">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-3xl font-bold text-white mt-8 mb-4">VibeSmiths Dashboard</h1>

          <div className="bg-zinc-800 rounded-xl shadow-xl p-6 w-full mb-6">
            <div className="text-sm text-zinc-400 mb-2">Logged in as</div>
            <div className="flex items-center gap-3 mb-6">
              {session?.user?.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-10 h-10 rounded-full"
                />
              )}
              <div>
                <div className="font-medium text-white">{session?.user?.name || 'User'}</div>
                <div className="text-xs text-zinc-400">{session?.user?.email || ''}</div>
              </div>
            </div>

            <div className="text-center py-3 border-t border-zinc-700 mb-4">
              <div className="text-3xl font-bold text-white">{trackCount}</div>
              <div className="text-sm text-zinc-400">Tracks Imported</div>
            </div>

            <Button
              variant="spotify"
              fullWidth
              size="lg"
              onClick={importTracks}
              loading={isImporting}
              disabled={isImporting}
            >
              {trackCount === 0 ? 'Import My Liked Tracks' : 'Refresh My Liked Tracks'}
            </Button>

            {trackCount > 0 && (
              <Link href="/playlist" className="block mt-4">
                <Button variant="outline" fullWidth>
                  View My Playlist
                </Button>
              </Link>
            )}

            {importedCount > 0 && (
              <div className="mt-4 text-sm text-center text-green-400">
                Successfully imported {importedCount} tracks!
              </div>
            )}

            {importError && (
              <div className="mt-4 text-sm text-center text-red-400">{importError}</div>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: '/' })}>
            Logout
          </Button>
        </div>
      </div>
    </main>
  );
}
