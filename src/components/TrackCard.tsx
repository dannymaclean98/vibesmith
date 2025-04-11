'use client';

import Image from 'next/image';
import { PlayIcon } from './icons/PlayIcon';

type TrackProps = {
  track: {
    id: string;
    spotifyTrackId: string;
    trackName: string;
    artistName: string;
    albumName: string | null;
    albumImageUrl: string | null;
  };
};

export function TrackCard({ track }: TrackProps) {
  const openSpotify = () => {
    window.open(`https://open.spotify.com/track/${track.spotifyTrackId}`, '_blank');
  };

  return (
    <div
      className="bg-zinc-800 rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-green-500/20 hover:scale-[1.02] cursor-pointer"
      onClick={openSpotify}
    >
      <div className="relative">
        {track.albumImageUrl ? (
          <div className="aspect-square w-full relative overflow-hidden">
            <Image
              src={track.albumImageUrl}
              alt={track.albumName || 'Album cover'}
              className="object-cover"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/70 to-transparent"></div>
            <button
              className="absolute bottom-4 right-4 bg-green-500 rounded-full p-3 shadow-lg transform transition-transform hover:scale-110 active:scale-95"
              onClick={e => {
                e.stopPropagation();
                openSpotify();
              }}
            >
              <PlayIcon className="w-5 h-5 text-white" />
            </button>
          </div>
        ) : (
          <div className="aspect-square w-full bg-zinc-700 flex items-center justify-center">
            <svg className="w-16 h-16 text-zinc-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
            </svg>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-lg truncate">{track.trackName}</h3>
            <p className="text-zinc-400 text-sm truncate">{track.artistName}</p>
            {track.albumName && (
              <p className="text-zinc-500 text-xs truncate mt-1">{track.albumName}</p>
            )}
          </div>
          <div className="flex-shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-green-500">
              <path
                d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.239.479.719.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 pt-2 flex items-center text-xs text-zinc-500">
        <span>Listen on Spotify</span>
        <svg viewBox="0 0 24 24" className="ml-1 w-3 h-3" fill="currentColor">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z" />
        </svg>
      </div>
    </div>
  );
}
