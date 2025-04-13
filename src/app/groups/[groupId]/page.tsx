'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { TrackCard } from '@/components/TrackCard';
import Image from 'next/image';

interface Member {
  id: string;
  userId: string;
  groupId: string;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  spotifyPlaylistId: string | null;
  spotifyPlaylistUrl: string | null;
  ownerId: string;
  members: Member[];
}

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
  likeCount: number;
};

export default function GroupDetail() {
  const params = useParams();
  const groupId = params.groupId as string;
  const { data: session, status } = useSession();
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [minLikes, setMinLikes] = useState(0);
  const [totalTracks, setTotalTracks] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isGeneratingPlaylist, setIsGeneratingPlaylist] = useState(false);
  const [playlistSuccess, setPlaylistSuccess] = useState<{
    playlistUrl: string;
    trackCount: number;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  // Auto-import tracks when viewing group
  useEffect(() => {
    if (status === 'authenticated') {
      autoImportUserTracks();
    }
  }, [status]);

  // Auto-import user's tracks from Spotify
  const autoImportUserTracks = async () => {
    try {
      // First check if user already has tracks
      const countResponse = await fetch('/api/tracks/count');
      const countData = await countResponse.json();
      
      // If user has no tracks, auto-import them
      if (countData.success && countData.count === 0) {
        // Show a temporary loading message
        setIsLoading(true);
        
        const importResponse = await fetch('/api/tracks/import', {
          method: 'POST',
        });
        
        if (!importResponse.ok) {
          console.error('Error auto-importing tracks');
        }
      }
    } catch (error) {
      console.error('Error in auto-import:', error);
    } finally {
      // Continue loading the group details and tracks
      if (groupId) {
        fetchGroupDetails();
        fetchGroupTracks(1, false);
      }
    }
  };

  // Fetch group data and tracks
  useEffect(() => {
    if (status === 'authenticated' && groupId) {
      fetchGroupDetails();
      fetchGroupTracks(1, false);
    }
  }, [status, groupId]);

  const fetchGroupDetails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/groups?groupId=${groupId}`);
      const data = await response.json();

      if (data.success && (data.ownedGroups.length > 0 || data.memberGroups.length > 0)) {
        const ownedGroup = data.ownedGroups.find((g: Group) => g.id === groupId);
        
        if (ownedGroup) {
          setGroup(ownedGroup);
          setIsOwner(true);
        } else {
          const memberGroup = data.memberGroups.find((g: Group) => g.id === groupId);
          if (memberGroup) {
            setGroup(memberGroup);
            setIsOwner(false);
          } else {
            setError('Group not found');
          }
        }
      } else {
        setError('Group not found or you do not have access');
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGroupTracks = async (currentPage = 1, append = false) => {
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setSpotifyError(null);

      // Build the query parameters
      const userIdsParam = selectedUserIds.length > 0 ? `&userIds=${selectedUserIds.join(',')}` : '';
      const response = await fetch(`/api/groups/${groupId}/tracks?minLikes=${minLikes}&page=${currentPage}&limit=100${userIdsParam}`);
      const data = await response.json();

      if (data.success) {
        // If appending, add to existing tracks, otherwise replace
        if (append) {
          setTracks(prev => [...prev, ...data.tracks]);
        } else {
          setTracks(data.tracks);
        }
        
        // Set pagination data
        setTotalTracks(data.pagination.totalTracks);
        setTotalPages(data.pagination.totalPages);
        setHasNextPage(data.pagination.hasNextPage);
        
        // Check if there were Spotify API issues
        if (data.spotifyError) {
          setSpotifyError(data.spotifyError);
        }
      } else {
        if (data.error?.includes('Spotify access') || data.error?.includes('token')) {
          // This is a Spotify-specific error
          setSpotifyError(data.error);
        } else {
          setError(data.error || 'Failed to fetch tracks');
        }
      }
    } catch (error) {
      console.error('Error fetching tracks:', error);
      setError('An unexpected error occurred while fetching tracks');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (hasNextPage) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchGroupTracks(nextPage, true);
    }
  };

  // Toggle a user filter selection
  const toggleUserFilter = (userId: string) => {
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Clear all user filters
  const clearUserFilters = () => {
    setSelectedUserIds([]);
  };

  // When any filter changes, reset pagination and fetch first page
  useEffect(() => {
    if (status === 'authenticated' && groupId) {
      setPage(1);
      fetchGroupTracks(1, false);
    }
  }, [minLikes, selectedUserIds, groupId, status]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingMember(true);
    setAddMemberError(null);

    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newMemberEmail }),
      });

      const data = await response.json();

      if (data.success) {
        setNewMemberEmail('');
        // Update the group with the new member
        fetchGroupDetails();
      } else {
        setAddMemberError(data.error || 'Failed to add member');
      }
    } catch (error) {
      console.error('Error adding member:', error);
      setAddMemberError('An unexpected error occurred');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members?userId=${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        // Update the group members list
        fetchGroupDetails();
      } else {
        setError(data.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      setError('An unexpected error occurred');
    }
  };

  const handleLeaveGroup = async () => {
    if (!session?.user?.id) return;
    
    try {
      const response = await fetch(`/api/groups/${groupId}/members?userId=${session.user.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        router.push('/dashboard');
      } else {
        setError(data.error || 'Failed to leave group');
      }
    } catch (error) {
      console.error('Error leaving group:', error);
      setError('An unexpected error occurred');
    }
  };

  const handleGeneratePlaylist = async () => {
    setIsGeneratingPlaylist(true);
    setError(null);
    setPlaylistSuccess(null);

    try {
      const response = await fetch(`/api/groups/${groupId}/playlist`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setPlaylistSuccess({
          playlistUrl: data.playlistUrl,
          trackCount: data.trackCount,
        });
        fetchGroupDetails(); // Update group with playlist info
      } else {
        setError(data.error || 'Failed to generate playlist');
      }
    } catch (error) {
      console.error('Error generating playlist:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsGeneratingPlaylist(false);
    }
  };

  // Function to refresh all group members' tracks
  const refreshGroupTracks = async () => {
    setIsRefreshing(true);
    setError(null);
    setRefreshSuccess(null);
    
    try {
      const response = await fetch(`/api/groups/${groupId}/refresh-tracks`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Show success message
        setRefreshSuccess(data.message || `Successfully refreshed ${data.tracksUpdated} tracks!`);
        
        // Reset pagination and fetch the updated tracks
        setPage(1);
        await fetchGroupTracks(1, false);
      } else {
        setError(data.error || 'Failed to refresh tracks');
      }
    } catch (error) {
      console.error('Error refreshing tracks:', error);
      setError('An unexpected error occurred while refreshing tracks');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Close filter menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-900 to-black">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center p-4 bg-gradient-to-b from-zinc-900 to-black">
        <div className="w-full max-w-md p-6 space-y-6">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-3xl font-bold text-white mt-8 mb-2">Error</h1>
            <div className="bg-zinc-800 rounded-xl shadow-xl p-6 w-full">
              <p className="text-red-400">{error}</p>
              <div className="mt-6">
                <Link href="/dashboard">
                  <Button variant="outline" fullWidth>Back to Dashboard</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!group) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">{group?.name}</h1>
            {group?.description && (
              <p className="text-zinc-400 mt-2">{group.description}</p>
            )}
          </div>
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

        {spotifyError && (
          <div className="p-4 mb-6 bg-amber-900/40 border border-amber-700 rounded-md text-amber-200">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z" fill="currentColor"/>
              </svg>
              <div>
                <p className="font-medium">Spotify connection issue</p>
                <p className="text-sm mt-1">{spotifyError}</p>
                <p className="text-xs mt-2">
                  You can still view tracks from our database, but genre information may be unavailable.
                  {' '}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="underline hover:text-white p-0 h-auto"
                    onClick={() => signOut({ callbackUrl: '/' })}
                  >
                    Sign out and reconnect
                  </Button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Members Section */}
        <div className="bg-zinc-800/50 rounded-xl p-4 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Members</h2>
          <div className="flex flex-wrap gap-2">
            {group?.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 bg-zinc-700/50 rounded-full px-3 py-1"
              >
                {member.user.image ? (
                  <div className="relative w-6 h-6">
                    <Image
                      src={member.user.image}
                      alt={member.user.name || 'Member'}
                      className="rounded-full"
                      fill
                      sizes="24px"
                    />
                  </div>
                ) : (
                  <div className="w-6 h-6 bg-zinc-600 rounded-full" />
                )}
                <span className="text-sm text-white">{member.user.name}</span>
                {isOwner && session?.user?.id !== member.user.id && (
                  <button
                    onClick={() => handleRemoveMember(member.user.id)}
                    className="text-zinc-400 hover:text-red-400"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {isOwner && (
            <form onSubmit={handleAddMember} className="mt-4">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="Add member by email"
                  className="flex-1 bg-zinc-700 text-white rounded-md px-3 py-2 text-sm"
                />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={isAddingMember}
                >
                  Add
                </Button>
              </div>
              {addMemberError && (
                <p className="text-red-400 text-sm mt-2">{addMemberError}</p>
              )}
            </form>
          )}
        </div>

        {/* Filter Controls */}
        <div className="bg-zinc-800/50 rounded-xl p-4 mb-4">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">Group Playlist</h2>
                <p className="text-sm text-zinc-400">
                  Showing {tracks.length} of {totalTracks} tracks.
                  {minLikes > 0 && ` Filtered by ${minLikes}+ likes.`}
                  {selectedUserIds.length > 0 && ` Filtered by ${selectedUserIds.length} member${selectedUserIds.length > 1 ? 's' : ''}.`}
                  {refreshSuccess && (
                    <span className="inline-flex items-center ml-2 text-green-400">
                      <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {refreshSuccess}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshGroupTracks}
                  disabled={isRefreshing}
                  className="p-1 h-8 w-8 rounded-full"
                  title="Refresh Tracks"
                >
                  {isRefreshing ? (
                    <div className="animate-spin h-5 w-5 border-2 border-zinc-400 border-t-green-500 rounded-full"></div>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 3V9H15M3 21V15H9M3 9C3 4.5 6.5 3 9 3C11.5 3 21 3 21 3M3 9C3 9 3 18.5 3 21M21 15C21 19.5 17.5 21 15 21C12.5 21 3 21 3 21M21 15C21 15 21 5.5 21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </Button>

                <div className="flex items-center gap-2">
                  <label htmlFor="minLikes" className="text-sm text-zinc-400">
                    Min Likes:
                  </label>
                  <select
                    id="minLikes"
                    value={minLikes}
                    onChange={(e) => setMinLikes(Number(e.target.value))}
                    className="bg-zinc-700 text-white rounded px-2 py-1 text-sm"
                  >
                    <option value="0">All</option>
                    <option value="1">1+</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                    <option value="4">4+</option>
                    <option value="5">5+</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Member filter */}
            <div className="relative" ref={filterMenuRef}>
              <div className="flex items-center">
                <button
                  onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                  className="flex items-center gap-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1.5 rounded-md transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4h16c.6 0 1 .4 1 1v1c0 .5-.4 1-1 1H4c-.6 0-1-.5-1-1V5c0-.6.4-1 1-1zm4 8h8c.6 0 1 .4 1 1v1c0 .5-.4 1-1 1H8c-.6 0-1-.5-1-1v-1c0-.6.4-1 1-1zm4 8h0c.6 0 1 .4 1 1v1c0 .5-.4 1-1 1h0c-.6 0-1-.5-1-1v-1c0-.6.4-1 1-1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Filter by Members
                  <svg className={`w-3 h-3 transition-transform ${isFilterMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                
                {selectedUserIds.length > 0 && (
                  <button
                    onClick={clearUserFilters}
                    className="ml-2 text-xs text-zinc-400 hover:text-white"
                  >
                    Clear filters
                  </button>
                )}
              </div>
              
              {isFilterMenuOpen && (
                <div className="absolute z-10 mt-1 w-64 bg-zinc-800 rounded-md shadow-lg py-1 max-h-60 overflow-y-auto">
                  {group?.members.map((member) => (
                    <div 
                      key={member.user.id}
                      className="px-3 py-2 hover:bg-zinc-700 cursor-pointer flex items-center gap-2"
                      onClick={() => toggleUserFilter(member.user.id)}
                    >
                      <div className="flex-shrink-0">
                        {member.user.image ? (
                          <div className="relative w-6 h-6">
                            <Image
                              src={member.user.image}
                              alt={member.user.name || 'Member'}
                              className="rounded-full"
                              fill
                              sizes="24px"
                            />
                          </div>
                        ) : (
                          <div className="w-6 h-6 bg-zinc-600 rounded-full" />
                        )}
                      </div>
                      <span className="text-sm text-white flex-1">{member.user.name || 'Unknown'}</span>
                      <div className="flex-shrink-0">
                        {selectedUserIds.includes(member.user.id) ? (
                          <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        ) : (
                          <div className="w-4 h-4 border border-zinc-500 rounded-sm" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tracks Section */}
        <div className="space-y-2">
          {tracks.length === 0 && !isLoading ? (
            <div className="text-center p-8 bg-zinc-800/50 rounded-xl">
              <p className="text-zinc-400 mb-4">
                {minLikes > 0 
                  ? `No tracks have been liked by ${minLikes} or more users.` 
                  : 'No tracks have been added to this group yet.'}
              </p>
              {minLikes > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setMinLikes(0)}
                >
                  Show All Tracks
                </Button>
              )}
              {minLikes === 0 && (
                <p className="text-sm text-zinc-500">
                  Members can add tracks by liking songs in their personal library.
                </p>
              )}
            </div>
          ) : (
            <>
              {tracks.map(track => (
                <div key={track.id} className="relative">
                  <TrackCard track={track} />
                  {/* Like count badge */}
                  {track.likeCount > 1 && (
                    <div className="absolute top-0 right-0 bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-bl-md transform translate-x-1 -translate-y-1">
                      {track.likeCount} ♥
                    </div>
                  )}
                </div>
              ))}
              
              {/* Load More Button */}
              {hasNextPage && (
                <div className="flex justify-center mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div>
                        <span>Loading...</span>
                      </div>
                    ) : (
                      'Load More Tracks'
                    )}
                  </Button>
                </div>
              )}
              
              {/* Show pagination summary */}
              {totalPages > 1 && (
                <div className="text-center text-sm text-zinc-500 mt-2">
                  Page {page} of {totalPages}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
} 