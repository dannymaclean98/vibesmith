'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export function Header() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.refresh();
  };

  const getDisplayName = () => {
    if (user?.displayName) return user.displayName;
    if (user?.member?.name) return user.member.name;
    return 'You';
  };

  const getInitials = () => {
    const name = user?.displayName || user?.member?.name;
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return '👤';
  };

  const getAvatarUrl = () => {
    return user?.avatarUrl || user?.member?.avatarUrl || null;
  };

  return (
    <header className="bg-black/40 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-50">
      <div className="flex justify-between items-center max-w-6xl mx-auto">
        <Link 
          href="/" 
          className="flex items-center gap-2 sm:gap-3 group"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
            <span className="text-base sm:text-lg">🎵</span>
          </div>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-white">
            VibeSmiths
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Nav - hidden on mobile, show on sm+ */}
          <nav className="hidden sm:flex items-center gap-4 lg:gap-6">
            <Link 
              href="/" 
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Playlist
            </Link>
            <Link 
              href="/members" 
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Members
            </Link>
          </nav>

          {/* Auth Section */}
          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link 
                href="/profile"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                {getAvatarUrl() ? (
                  <img
                    src={getAvatarUrl()!}
                    alt={getDisplayName()}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                    <span className="text-xs font-medium text-white">
                      {getInitials()}
                    </span>
                  </div>
                )}
                <span className="text-sm text-zinc-300 hidden md:block">
                  {getDisplayName()}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs text-zinc-500 hover:text-white transition-colors hidden sm:block"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 rounded-lg transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
            >
              Claim Profile
            </Link>
          )}

          {/* Mobile nav icons */}
          <div className="flex sm:hidden items-center gap-1">
            <Link 
              href="/" 
              className="p-2 text-zinc-400 hover:text-white transition-colors"
              title="Playlist"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </Link>
            <Link 
              href="/members" 
              className="p-2 text-zinc-400 hover:text-white transition-colors"
              title="Members"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
