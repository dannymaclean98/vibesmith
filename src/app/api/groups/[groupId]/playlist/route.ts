import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createPlaylist, addTracksToPlaylist } from '@/lib/spotify';

// POST /api/groups/[groupId]/playlist - Generate a playlist for a group
export async function POST(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || !session.accessToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const groupId = await Promise.resolve(params.groupId);
    
    // Check if user is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId
        }
      }
    });
    
    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'You are not a member of this group' }, 
        { status: 403 }
      );
    }
    
    // Get group details
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });
    
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' }, 
        { status: 404 }
      );
    }
    
    // Get all members' Spotify IDs
    const memberIds = group.members.map(member => member.user.id);
    
    // Get all liked tracks from all members
    const allTracks = await prisma.likedTrack.findMany({
      where: {
        userId: {
          in: memberIds
        }
      },
      distinct: ['spotifyTrackId'],
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (allTracks.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No tracks found for group members' }, 
        { status: 400 }
      );
    }
    
    // Format track URIs for Spotify API
    const trackUris = allTracks.map(track => `spotify:track:${track.spotifyTrackId}`);
    
    // Get user's Spotify details
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { tokens: true }
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' }, 
        { status: 404 }
      );
    }
    
    if (!user.spotifyId) {
      // Try to fetch the Spotify ID from the Spotify API
      try {
        const spotifyResponse = await fetch('https://api.spotify.com/v1/me', {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
          },
        });
        
        if (!spotifyResponse.ok) {
          return NextResponse.json(
            { success: false, error: 'Failed to fetch Spotify profile. Please verify your Spotify connection.' }, 
            { status: 400 }
          );
        }
        
        const spotifyProfile = await spotifyResponse.json();
        
        if (!spotifyProfile.id) {
          return NextResponse.json(
            { success: false, error: 'Spotify ID not found in profile.' }, 
            { status: 400 }
          );
        }
        
        // Update the user with the Spotify ID
        await prisma.user.update({
          where: { id: user.id },
          data: { spotifyId: spotifyProfile.id as string }
        });
        
        // Update our local reference
        user.spotifyId = spotifyProfile.id as string;
      } catch (error) {
        console.error('Error fetching Spotify profile:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to verify Spotify connection. Please try the "Verify Spotify Connection" button first.' }, 
          { status: 400 }
        );
      }
    }
    
    // Create a new playlist
    const playlistName = `${group.name} - VibeSmiths Playlist`;
    const description = `A collaborative playlist created by VibeSmiths for ${group.name} group members`;
    
    try {
      // Create playlist on Spotify
      const playlist = await createPlaylist(
        session.accessToken,
        user.spotifyId,
        playlistName,
        description,
        true // Make it public
      );
      
      // Add tracks to the playlist
      await addTracksToPlaylist(session.accessToken, playlist.id, trackUris);
      
      // Update group with playlist details
      const updatedGroup = await prisma.group.update({
        where: { id: groupId },
        data: {
          spotifyPlaylistId: playlist.id,
          spotifyPlaylistUrl: playlist.external_urls.spotify
        }
      });
      
      return NextResponse.json({ 
        success: true, 
        playlistId: playlist.id,
        playlistUrl: playlist.external_urls.spotify,
        trackCount: allTracks.length
      });
    } catch (error: any) {
      console.error('Error creating Spotify playlist:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to create Spotify playlist' }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error generating group playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate group playlist' }, 
      { status: 500 }
    );
  }
} 