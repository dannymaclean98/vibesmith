'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { TrackList } from './TrackList';
import { SearchBar } from './SearchBar';

interface Member {
  id: string;
  name: string;
  phone: string | null;
  color: string | null;
  avatarUrl: string | null;
}

interface Reaction {
  id: string;
  emoji: string;
  member: Member;
}

interface Track {
  id: string;
  trackName: string;
  artistName: string;
  albumName: string | null;
  albumImageUrl: string | null;
  spotifyUrl: string | null;
  sentAt: Date | string;
  sender: Member;
  reactions: Reaction[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface TrackBrowserProps {
  initialTracks: Track[];
  initialPagination: Pagination;
}

const TRACKS_PER_PAGE = 50;

export function TrackBrowser({ initialTracks, initialPagination }: TrackBrowserProps) {
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [currentSearch, setCurrentSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch tracks with search and pagination
  const fetchTracks = useCallback(async (page: number, search: string, append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(TRACKS_PER_PAGE),
      });
      if (search) {
        params.set('search', search);
      }

      const res = await fetch(`/api/tracks?${params}`);
      const data = await res.json();

      if (append) {
        setTracks((prev) => [...prev, ...data.tracks]);
      } else {
        setTracks(data.tracks);
      }
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch tracks:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setCurrentSearch(query);
    fetchTracks(1, query, false);
  }, [fetchTracks]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && pagination.hasMore) {
      fetchTracks(pagination.page + 1, currentSearch, true);
    }
  }, [fetchTracks, isLoadingMore, pagination.hasMore, pagination.page, currentSearch]);

  // Infinite scroll with Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pagination.hasMore && !isLoadingMore && !isLoading) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [handleLoadMore, pagination.hasMore, isLoadingMore, isLoading]);

  // Handle adding a reaction to a track (avoids stale closure issues)
  const handleReactionAdded = useCallback((trackId: string, reaction: Reaction) => {
    console.log('[TrackBrowser] handleReactionAdded called:', { trackId, reaction });
    setTracks(prevTracks => 
      prevTracks.map(track =>
        track.id === trackId
          ? { ...track, reactions: [...track.reactions, reaction] }
          : track
      )
    );
  }, []);

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <SearchBar onSearch={handleSearch} />

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-zinc-400">
            <div className="w-5 h-5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
            <span>Searching...</span>
          </div>
        </div>
      )}

      {/* Results */}
      {!isLoading && (
        <>
          {/* Search Results Info */}
          {currentSearch && (
            <div className="flex items-center justify-between px-4">
              <p className="text-sm text-zinc-400">
                {pagination.total === 0 ? (
                  <>No results for &ldquo;{currentSearch}&rdquo;</>
                ) : (
                  <>Found {pagination.total} track{pagination.total !== 1 ? 's' : ''} matching &ldquo;{currentSearch}&rdquo;</>
                )}
              </p>
              <button
                onClick={() => handleSearch('')}
                className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Clear search
              </button>
            </div>
          )}

          {/* Track List */}
          {tracks.length > 0 ? (
            <TrackList 
              tracks={tracks} 
              showFooter={false}
              onReactionAdded={handleReactionAdded}
            />
          ) : (
            !currentSearch && (
              <div className="text-center py-16">
                <p className="text-zinc-500 text-lg mb-4">No tracks yet!</p>
                <p className="text-zinc-600 text-sm">
                  Run <code className="bg-zinc-800 px-2 py-1 rounded">npx tsx scripts/import-data.ts</code> to import your data.
                </p>
              </div>
            )
          )}

          {/* Load More Trigger / Footer */}
          <div ref={loadMoreRef} className="py-8">
            {isLoadingMore && (
              <div className="flex items-center justify-center gap-3 text-zinc-400">
                <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Loading more tracks...</span>
              </div>
            )}

            {!isLoadingMore && !pagination.hasMore && tracks.length > 0 && (
              <div className="text-center border-t border-white/5 pt-8">
                <p className="text-zinc-500 text-sm">
                  {currentSearch 
                    ? `Showing all ${pagination.total} matching tracks`
                    : `Showing all ${pagination.total} tracks`
                  }
                </p>
              </div>
            )}

            {!isLoadingMore && pagination.hasMore && (
              <div className="text-center">
                <button
                  onClick={handleLoadMore}
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Load more tracks ({pagination.total - tracks.length} remaining)
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

