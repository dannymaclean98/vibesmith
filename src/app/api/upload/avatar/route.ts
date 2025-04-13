import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Convert to Buffer and save to database
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const avatarUrl = `/api/avatar/${user.id}`;

    // Update user with avatar data
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        avatarData: buffer,
        avatarMime: file.type,
        avatarUrl,
      },
    });

    // Also update the linked Member's avatarUrl so it shows in track lists
    if (updatedUser.memberId) {
      await prisma.member.update({
        where: { id: updatedUser.memberId },
        data: { avatarUrl },
      });
    }

    return NextResponse.json({
      success: true,
      avatarUrl: `/api/avatar/${user.id}`,
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
