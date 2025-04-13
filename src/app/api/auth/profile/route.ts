import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { displayName, avatarUrl } = await request.json();

    // Update the user profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName: displayName !== undefined ? displayName : user.displayName,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : user.avatarUrl,
      },
      include: { member: true },
    });

    // Also update the linked Member's name and avatar if they have one
    // This ensures the playlist UI shows the updated name
    if (updatedUser.memberId) {
      // If displayName was explicitly provided (even if null/empty), use it
      // Otherwise keep the member's current name
      const memberName = displayName !== undefined && displayName !== null && displayName.trim() !== ''
        ? displayName.trim()
        : updatedUser.member?.name;
      
      await prisma.member.update({
        where: { id: updatedUser.memberId },
        data: {
          name: memberName,
          avatarUrl: avatarUrl !== undefined ? avatarUrl : updatedUser.member?.avatarUrl,
        },
      });
    }

    // Fetch the updated member data
    const finalUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { member: true },
    });

    return NextResponse.json({
      user: {
        id: finalUser!.id,
        phone: finalUser!.phone,
        displayName: finalUser!.displayName,
        avatarUrl: finalUser!.avatarUrl,
        member: finalUser!.member,
      },
    });
  } catch (error) {
    console.error('Error in profile update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
