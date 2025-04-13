'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { redirect, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [trackCount, setTrackCount] = useState(0);
  const [ownedGroups, setOwnedGroups] = useState<any[]>([]);
  const [memberGroups, setMemberGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication
  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/');
    }
  }, [status]);

  // Get track count and groups on load
  useEffect(() => {
    if (status === 'authenticated') {
      fetchTrackCount();
      fetchGroups();
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

  // Fetch user's groups
  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/groups');
      const data = await response.json();

      if (data.success) {
        setOwnedGroups(data.ownedGroups || []);
        setMemberGroups(data.memberGroups || []);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setIsLoading(false);
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
      <div className="w-full max-w-4xl p-6 space-y-8">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-3xl font-bold text-white mt-8 mb-4">VibeSmiths Dashboard</h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            {/* User Profile & Tracks */}
            <div className="bg-zinc-800 rounded-xl shadow-xl p-6 w-full">
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

              {trackCount > 0 ? (
                <Link href="/playlist">
                  <Button variant="spotify" fullWidth size="lg">
                    View My Playlist
                  </Button>
                </Link>
              ) : (
                <div className="rounded-md bg-zinc-700/40 p-4 text-sm text-zinc-300">
                  <p className="mb-2">
                    <span className="font-medium text-green-400">Auto-import enabled!</span> Your Spotify tracks will be imported automatically when you view playlists.
                  </p>
                  <div className="mt-4 flex justify-center">
                    <div className="animate-pulse flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full delay-150"></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full delay-300"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Groups Management */}
            <div className="bg-zinc-800 rounded-xl shadow-xl p-6 w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">My Groups</h2>
                <Link href="/groups/create">
                  <Button variant="spotify" size="sm">Create Group</Button>
                </Link>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                </div>
              ) : (
                <>
                  {ownedGroups.length === 0 && memberGroups.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-zinc-700 rounded-lg">
                      <p className="text-zinc-400 mb-4">You haven't created or joined any groups yet</p>
                      <Link href="/groups/create">
                        <Button variant="outline" size="sm">Create Your First Group</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {ownedGroups.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-zinc-400 mb-2">Groups You Own</h3>
                          <ul className="space-y-2">
                            {ownedGroups.map((group) => (
                              <li key={group.id} className="border border-zinc-700 rounded-lg p-3">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="font-medium text-white">{group.name}</div>
                                    <div className="text-xs text-zinc-400">
                                      {group.members.length} members
                                    </div>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push(`/groups/${group.id}`)}
                                  >
                                    Manage
                                  </Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {memberGroups.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-zinc-400 mb-2">Groups You've Joined</h3>
                          <ul className="space-y-2">
                            {memberGroups.map((group) => (
                              <li key={group.id} className="border border-zinc-700 rounded-lg p-3">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="font-medium text-white">{group.name}</div>
                                    <div className="text-xs text-zinc-400">
                                      Owner: {group.owner.name || 'Unknown'}
                                    </div>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push(`/groups/${group.id}`)}
                                  >
                                    View
                                  </Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: '/' })} className="mt-6">
            Logout
          </Button>
        </div>
      </div>
    </main>
  );
}
