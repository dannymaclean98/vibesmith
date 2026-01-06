'use client';

interface TrackCardProps {
  track: {
    id: string;
    name: string;
    artist: string;
    album?: string | null;
    albumArt?: string | null;
    spotifyUrl?: string | null;
  };
}

export function TrackCard({ track }: TrackCardProps) {
  return (
    <div className="bg-zinc-900/60 backdrop-blur-sm border border-white/5 rounded-2xl p-6 sm:p-8 shadow-xl">
      <div className="flex flex-col items-center text-center">
        {/* Album Art */}
        <div className="relative mb-6">
          {track.albumArt ? (
            <img
              src={track.albumArt}
              alt={track.album || track.name}
              className="w-48 h-48 sm:w-56 sm:h-56 rounded-xl shadow-2xl shadow-black/50 object-cover"
            />
          ) : (
            <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center shadow-2xl">
              <span className="text-6xl">🎵</span>
            </div>
          )}
          {/* Decorative glow */}
          <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur-xl -z-10" />
        </div>

        {/* Track Info */}
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 line-clamp-2">
          {track.name}
        </h2>
        <p className="text-zinc-400 text-lg mb-1">{track.artist}</p>
        {track.album && (
          <p className="text-zinc-500 text-sm">{track.album}</p>
        )}

        {/* Spotify Link */}
        {track.spotifyUrl && (
          <a
            href={track.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Listen on Spotify
          </a>
        )}
      </div>

      {/* Question */}
      <div className="mt-8 text-center">
        <p className="text-zinc-300 text-lg font-medium">
          Who sent this track? 🤔
        </p>
      </div>
    </div>
  );
}

