import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getSavedTracksCount } from '@/services/spotify';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: NextRequest) {
  // Get session
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the count of saved tracks
    const count = await getSavedTracksCount(session.user.id);

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Error getting track count:', error);
    return NextResponse.json(
      {
        error: 'Failed to get track count',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
