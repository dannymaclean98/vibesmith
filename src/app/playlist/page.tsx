'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { TrackCard } from '@/components/TrackCard';

type UserInfo = {
  id: string;
  name: string | null;
  image: string | null;
};

type Track = {
  id: string;
  spotifyTrackId: string;
  trackName: string;
  artistName: string;
  albumName: string | null;
  albumImageUrl: string | null;
  users: UserInfo[];
};

export default function PlaylistPage() {
  const { data: session, status } = useSession();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication
  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/');
    }
  }, [status]);

  // Auto-import tracks when viewing playlist
  useEffect(() => {
    if (status === 'authenticated') {
      autoImportTracks();
    }
  }, [status]);

  // Auto-import user's tracks from Spotify
  const autoImportTracks = async () => {
    try {
      // Check if user has any tracks already
      const countResponse = await fetch('/api/tracks/count');
      const countData = await countResponse.json();
      
      if (countData.success && countData.count === 0) {
        // No tracks, show loading and import
        setLoading(true);
        
        const importResponse = await fetch('/api/tracks/import', {
          method: 'POST',
        });
        
        if (importResponse.ok) {
          // Successfully imported, now fetch the tracks
          fetchTracks();
        } else {
          console.error('Error auto-importing tracks');
          setError('Failed to import your tracks. Please try again later.');
          setLoading(false);
        }
      } else {
        // User already has tracks, just fetch them
        fetchTracks();
      }
    } catch (error) {
      console.error('Error in auto-import:', error);
      setError('An unexpected error occurred. Please try again later.');
      setLoading(false);
    }
  };

  // Fetch tracks on load
  useEffect(() => {
    if (status === 'authenticated') {
      fetchTracks();
    }
  }, [status]);

  // Fetch all tracks from the API
  const fetchTracks = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tracks');

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setTracks(data.tracks);
      } else {
        setError(data.error || 'Failed to fetch tracks');
      }
    } catch (error) {
      console.error('Error fetching tracks:', error);
      setError('An unexpected error occurred while fetching tracks');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-900 to-black">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Your Tracks</h1>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-red-900/40 border border-red-700 rounded-md text-red-200">
            {error}
          </div>
        )}

        {tracks.length === 0 && !loading && !error ? (
          <div className="text-center p-8 bg-zinc-800/50 rounded-xl">
            <p className="text-zinc-400 mb-4">
              We're automatically importing your Spotify tracks. This may take a moment.
            </p>
            <div className="flex justify-center mt-4">
              <div className="animate-pulse flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full delay-150"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full delay-300"></div>
              </div>
            </div>
            <p className="text-sm text-zinc-500 mt-6">
              Your tracks will appear here automatically once imported.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {tracks.map(track => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
