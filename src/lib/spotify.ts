import prisma from '@/lib/prisma';

export const DEFAULT_SCOPES = [
  'user-read-email',
  'user-read-private',
  'user-library-read',
  'user-library-modify',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-private',
  'playlist-modify-public',
  'user-top-read',
  'user-follow-read',
  'user-follow-modify'
].join(' ');

// Save or update tokens in the database
export async function getTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: Date
) {
  // Check if tokens already exist for this user
  const existingTokens = await prisma.token.findUnique({
    where: { userId },
  });

  if (existingTokens) {
    // Update existing tokens
    return prisma.token.update({
      where: { userId },
      data: {
        accessToken,
        refreshToken,
        expiresAt,
      },
    });
  } else {
    // Create new tokens
    return prisma.token.create({
      data: {
        userId,
        accessToken,
        refreshToken,
        expiresAt,
      },
    });
  }
}

// Refresh the Spotify access token
export async function refreshAccessToken(refreshToken: string) {
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to refresh token');
    }

    // Calculate expiry time
    const expiresAt = Math.floor(Date.now() / 1000 + data.expires_in);

    return {
      accessToken: data.access_token,
      expiresAt,
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return null;
  }
}

// Create a playlist
export async function createPlaylist(
  accessToken: string,
  userId: string,
  name: string,
  description: string,
  isPublic: boolean = false
) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        description,
        public: isPublic,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to create playlist');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating playlist:', error);
    throw error;
  }
}

// Add tracks to a playlist
export async function addTracksToPlaylist(
  accessToken: string,
  playlistId: string,
  trackUris: string[]
) {
  try {
    // Spotify API limits adding 100 tracks at a time
    for (let i = 0; i < trackUris.length; i += 100) {
      const batch = trackUris.slice(i, i + 100);
      
      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: batch,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to add tracks to playlist');
      }
    }

    return true;
  } catch (error) {
    console.error('Error adding tracks to playlist:', error);
    throw error;
  }
} 