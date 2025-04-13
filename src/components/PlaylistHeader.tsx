'use client';

import { useSearch } from '@/lib/search-context';

interface PlaylistHeaderProps {
  memberCount: number;
  trackCount: number;
}

export function PlaylistHeader({ memberCount, trackCount }: PlaylistHeaderProps) {
  const { isExpanded, expand } = useSearch();

  return (
    <div className="mb-6 sm:mb-10">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* Album art - smaller on mobile */}
        <div className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-lg shadow-2xl shadow-emerald-500/25 flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
          <span className="text-5xl sm:text-6xl lg:text-7xl">🎧</span>
        </div>
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <p className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-zinc-400 mb-1 sm:mb-2">
            The Group Chat Playlist
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-2 sm:mb-4">
            VibeSmiths
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mb-3 sm:mb-4 hidden sm:block">
            All the tracks our crew has shared, with reactions and love.
          </p>
          <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 text-xs sm:text-sm text-zinc-500 flex-wrap">
            <span className="text-white font-medium">{memberCount} members</span>
            <span>•</span>
            <span>{trackCount.toLocaleString()} tracks</span>
            <span className="hidden sm:inline">•</span>
            {/* Search Button */}
            <button
              onClick={expand}
              className={`inline-flex items-center gap-1.5 transition-all ${
                isExpanded
                  ? 'text-emerald-400'
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              <svg 
                className="w-4 h-4" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                />
              </svg>
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
