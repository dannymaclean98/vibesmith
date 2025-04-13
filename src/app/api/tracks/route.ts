import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Initialize Prisma client
const prismaClient = new PrismaClient();

export async function GET(req: NextRequest) {
  // Get session
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all tracks for the user, ordered by newest first
    const tracks = await prismaClient.likedTrack.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    });

    // Transform to match group tracks format with users array
    const formattedTracks = tracks.map(track => ({
      ...track,
      users: [{
        id: track.user.id,
        name: track.user.name,
        image: track.user.image
      }]
    }));

    return NextResponse.json({
      success: true,
      tracks: formattedTracks,
    });
  } catch (error) {
    console.error('Error fetching tracks:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch tracks',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
