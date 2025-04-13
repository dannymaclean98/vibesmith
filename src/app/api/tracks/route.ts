import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const memberId = searchParams.get('memberId');
    const search = searchParams.get('search')?.trim();
    
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.TrackWhereInput = {};
    
    if (memberId) {
      where.senderId = memberId;
    }
    
    // Search across track name, artist name, album name, and sender name
    if (search) {
      where.OR = [
        { trackName: { contains: search, mode: 'insensitive' } },
        { artistName: { contains: search, mode: 'insensitive' } },
        { albumName: { contains: search, mode: 'insensitive' } },
        { sender: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [tracks, total] = await Promise.all([
      prisma.track.findMany({
        where,
        include: {
          sender: true,
          reactions: {
            include: {
              member: true,
            },
          },
        },
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.track.count({ where }),
    ]);

    return NextResponse.json({
      tracks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching tracks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tracks' },
      { status: 500 }
    );
  }
}
