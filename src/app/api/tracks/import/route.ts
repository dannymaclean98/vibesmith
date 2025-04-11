import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { saveLikedTracks } from '@/services/spotify';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: NextRequest) {
  // Get session
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Save the liked tracks
    const savedCount = await saveLikedTracks(session.user.id);

    return NextResponse.json({
      success: true,
      tracksImported: savedCount,
    });
  } catch (error) {
    console.error('Error importing tracks:', error);
    return NextResponse.json(
      {
        error: 'Failed to import tracks',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
