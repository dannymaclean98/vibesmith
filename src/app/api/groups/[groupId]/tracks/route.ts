import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> }
) {
  const session = await getServerSession(authOptions);
  const params = await context.params;
  const groupIdParam = params.groupId;
  
  // Get query params for filtering and pagination
  const searchParams = request.nextUrl.searchParams;
  const minLikes = parseInt(searchParams.get('minLikes') || '0', 10);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const userIdsParam = searchParams.get('userIds');
  const userIds = userIdsParam ? userIdsParam.split(',') : [];

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if user is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId: groupIdParam
        }
      }
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'You are not a member of this group' },
        { status: 403 }
      );
    }

    // Get all members' IDs
    const members = await prisma.groupMember.findMany({
      where: { groupId: groupIdParam },
      select: { userId: true }
    });

    const memberIds = members.map(member => member.userId);
    
    // If userIds filter is provided, use it to filter tracks, otherwise use all members
    const targetUserIds = userIds.length > 0 
      ? userIds.filter(id => memberIds.includes(id)) // Only include valid member IDs
      : memberIds;

    // Get all tracks from target members
    const allTracks = await prisma.likedTrack.findMany({
      where: {
        userId: {
          in: targetUserIds
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Group tracks
    const tracksMap = new Map();
    const spotifyTrackIds = allTracks.map(track => track.spotifyTrackId);

    allTracks.forEach(track => {
      if (tracksMap.has(track.spotifyTrackId)) {
        // Add this user to the existing track's users array
        const existingTrack = tracksMap.get(track.spotifyTrackId);
        
        // Only add the user if they're not already in the list
        if (!existingTrack.users.some((u: { id: string }) => u.id === track.user.id)) {
          existingTrack.users.push({
            id: track.user.id,
            name: track.user.name,
            image: track.user.image
          });
        }
      } else {    
        // Create a new entry with the first user
        tracksMap.set(track.spotifyTrackId, {
          ...track,
          users: [{
            id: track.user.id,
            name: track.user.name,
            image: track.user.image
          }]
        });
      }
    });
    
    // Convert map to array and sort by number of users who liked each track
    let uniqueTracks = Array.from(tracksMap.values())
      .map(track => ({
        ...track,
        likeCount: track.users.length
      }))
      .filter(track => track.likeCount >= minLikes);
    
    // Sort by like count (most to least)
    uniqueTracks = uniqueTracks.sort((a, b) => b.likeCount - a.likeCount);

    // Apply pagination
    const totalTracks = uniqueTracks.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTracks = uniqueTracks.slice(startIndex, endIndex);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalTracks / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      tracks: paginatedTracks,
      pagination: {
        page,
        limit,
        totalTracks,
        totalPages,
        hasNextPage,
        hasPrevPage
      },
      filters: {
        minLikes,
        userIds: targetUserIds
      },
    });
  } catch (error) {
    console.error('Error fetching group tracks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch group tracks' },
      { status: 500 }
    );
  }
} 