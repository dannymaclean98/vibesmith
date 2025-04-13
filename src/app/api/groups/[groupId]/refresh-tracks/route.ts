import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { saveLikedTracks } from '@/services/spotify';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  const session = await getServerSession(authOptions);
  const groupIdParam = await Promise.resolve(params.groupId);
  
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

    // Get all members of the group
    const members = await prisma.groupMember.findMany({
      where: { groupId: groupIdParam },
      include: {
        user: true
      }
    });

    // Update tracks for each member who is currently signed in with valid tokens
    // Note: We can only update tracks for the current user since we need their auth token
    // This is a limitation of how Spotify API works - we can't get other users' tracks
    
    let tracksUpdated = 0;
    
    // For now, we can only refresh the current user's tracks
    try {
      tracksUpdated = await saveLikedTracks(session.user.id);
    } catch (error) {
      console.error(`Error refreshing tracks for current user: ${error}`);
      // Continue even if there's an error for one user
    }

    return NextResponse.json({
      success: true,
      message: `${tracksUpdated} tracks refreshed`,
      tracksUpdated
    });
  } catch (error) {
    console.error('Error refreshing group tracks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to refresh group tracks' },
      { status: 500 }
    );
  }
} 