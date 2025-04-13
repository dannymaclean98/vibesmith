'use client';

import Image from 'next/image';
import { PlayIcon } from './icons/PlayIcon';

type UserInfo = {
  id: string;
  name: string | null;
  image: string | null;
};

type TrackProps = {
  track: {
    id: string;
    spotifyTrackId: string;
    trackName: string;
    artistName: string;
    albumName: string | null;
    albumImageUrl: string | null;
    users: UserInfo[];
    likeCount: number;
  };
};

export function TrackCard({ track }: TrackProps) {
  const openSpotify = () => {
    window.open(`https://open.spotify.com/track/${track.spotifyTrackId}`, '_blank');
  };

  return (
    <div
      className="bg-zinc-800/40 hover:bg-zinc-800 rounded-md overflow-hidden transition-all duration-300 group cursor-pointer"
      onClick={openSpotify}
    >
      <div className="flex items-center p-2 gap-3">
        <div className="flex-shrink-0">
          {track.albumImageUrl ? (
            <div className="relative w-12 h-12">
              <Image
                src={track.albumImageUrl}
                alt={track.albumName || 'Album cover'}
                className="object-cover rounded-md"
                fill
                sizes="48px"
              />
            </div>
          ) : (
            <div className="w-12 h-12 bg-zinc-700 rounded-md flex items-center justify-center">
              <svg className="w-6 h-6 text-zinc-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium text-base truncate">{track.trackName}</h3>
          <p className="text-zinc-400 text-sm truncate">{track.artistName}</p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex -space-x-2">
            {track.users.map((user, index) => (
              <div 
                key={user.id} 
                className={`relative w-8 h-8 ring-2 ring-zinc-800 rounded-full transition-all ${index > 0 ? 'hover:translate-x-1' : ''}`}
                style={{ zIndex: track.users.length - index }}
                title={user.name || 'User'}
              >
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name || 'User profile'}
                    className="object-cover rounded-full"
                    fill
                    sizes="32px"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-700 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-zinc-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <button
            className="bg-green-500 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg transform hover:scale-110 active:scale-95"
            onClick={e => {
              e.stopPropagation();
              openSpotify();
            }}
          >
            <PlayIcon className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
