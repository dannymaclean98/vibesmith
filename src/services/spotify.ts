import SpotifyWebApi from 'spotify-web-api-node';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prismaClient = new PrismaClient();

// Initialize the Spotify API with credentials
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.NEXTAUTH_URL + '/api/auth/callback/spotify',
});

// Helper to set credentials for a user
export const setSpotifyCredentials = async (userId: string) => {
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    include: { tokens: true },
  });

  if (!user || !user.tokens) {
    throw new Error('User or tokens not found');
  }

  spotifyApi.setAccessToken(user.tokens.accessToken);
  spotifyApi.setRefreshToken(user.tokens.refreshToken);

  // Check if token is expired and refresh if needed
  if (new Date() > user.tokens.expiresAt) {
    try {
      const data = await spotifyApi.refreshAccessToken();

      // Update token in database
      await prismaClient.token.update({
        where: { userId: user.id },
        data: {
          accessToken: data.body.access_token,
          refreshToken: data.body.refresh_token || user.tokens.refreshToken,
          expiresAt: new Date(Date.now() + data.body.expires_in * 1000),
        },
      });

      // Update the local Spotify API instance
      spotifyApi.setAccessToken(data.body.access_token);
      if (data.body.refresh_token) {
        spotifyApi.setRefreshToken(data.body.refresh_token);
      }
    } catch (error) {
      console.error('Error refreshing Spotify token:', error);
      throw new Error('Failed to refresh token. You may need to login again.');
    }
  }

  return spotifyApi;
};

// Get all liked tracks for a user
export const getUserLikedTracks = async (userId: string) => {
  const api = await setSpotifyCredentials(userId);
  let allTracks: SpotifyApi.SavedTrackObject[] = [];
  let offset = 0;
  const limit = 50;
  let hasMore = true;

  // Spotify API has a pagination limit, so we need to make multiple requests
  while (hasMore) {
    const response = await api.getMySavedTracks({ limit, offset });
    const tracks = response.body.items;
    allTracks = [...allTracks, ...tracks];
    offset += limit;
    hasMore = tracks.length === limit;
  }

  return allTracks;
};

// Save liked tracks to database
export const saveLikedTracks = async (userId: string) => {
  const likedTracks = await getUserLikedTracks(userId);

  // Process tracks in batches to avoid hitting database limits
  const batchSize = 100;
  const batches = Math.ceil(likedTracks.length / batchSize);

  let totalSaved = 0;

  for (let i = 0; i < batches; i++) {
    const startIndex = i * batchSize;
    const endIndex = Math.min(startIndex + batchSize, likedTracks.length);
    const batch = likedTracks.slice(startIndex, endIndex);

    // Create tracks in a transaction
    await prismaClient.$transaction(
      batch.map(track => {
        const { track: trackData } = track;
        return prismaClient.likedTrack.upsert({
          where: {
            userId_spotifyTrackId: {
              userId,
              spotifyTrackId: trackData.id,
            },
          },
          update: {
            trackName: trackData.name,
            artistName: trackData.artists.map(artist => artist.name).join(', '),
            albumName: trackData.album.name,
            albumImageUrl: trackData.album.images[0]?.url,
          },
          create: {
            userId,
            spotifyTrackId: trackData.id,
            trackName: trackData.name,
            artistName: trackData.artists.map(artist => artist.name).join(', '),
            albumName: trackData.album.name,
            albumImageUrl: trackData.album.images[0]?.url,
          },
        });
      })
    );

    totalSaved += batch.length;
  }

  return totalSaved;
};

// Get count of saved tracks for a user
export const getSavedTracksCount = async (userId: string) => {
  return prismaClient.likedTrack.count({
    where: { userId },
  });
};
