import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: { avatarData: true, avatarMime: true },
    });

    if (!user?.avatarData) {
      // Return a 404 or redirect to a default avatar
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(user.avatarData, {
      headers: {
        'Content-Type': user.avatarMime || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
      },
    });
  } catch (error) {
    console.error('Error serving avatar:', error);
    return new NextResponse(null, { status: 500 });
  }
}

