import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/groups/[groupId]/members - Get all members of a group
export async function GET(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
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
    
    // Get all members of the group
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });
    
    return NextResponse.json({ success: true, members });
  } catch (error) {
    console.error('Error fetching group members:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch group members' }, 
      { status: 500 }
    );
  }
}

// POST /api/groups/[groupId]/members - Add a member to a group
export async function POST(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const groupId = await Promise.resolve(params.groupId);
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' }, 
        { status: 400 }
      );
    }
    
    // Check if user is the owner of the group
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });
    
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' }, 
        { status: 404 }
      );
    }
    
    if (group.ownerId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Only the group owner can add members' }, 
        { status: 403 }
      );
    }
    
    // Find the user by email
    const userToAdd = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!userToAdd) {
      return NextResponse.json(
        { success: false, error: 'User not found with this email' }, 
        { status: 404 }
      );
    }
    
    // Check if user is already a member
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: userToAdd.id,
          groupId
        }
      }
    });
    
    if (existingMember) {
      return NextResponse.json(
        { success: false, error: 'User is already a member of this group' }, 
        { status: 400 }
      );
    }
    
    // Add user to the group
    const newMember = await prisma.groupMember.create({
      data: {
        userId: userToAdd.id,
        groupId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });
    
    return NextResponse.json({ success: true, member: newMember }, { status: 201 });
  } catch (error) {
    console.error('Error adding group member:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add group member' }, 
      { status: 500 }
    );
  }
}

// DELETE /api/groups/[groupId]/members/[userId] - Remove a member from a group
export async function DELETE(
  request: Request,
  { params }: { params: { groupId: string; userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const groupId = await Promise.resolve(params.groupId);
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' }, 
        { status: 400 }
      );
    }
    
    // Check if user is the owner of the group
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });
    
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' }, 
        { status: 404 }
      );
    }
    
    // Only allow the group owner or the member themselves to remove
    if (group.ownerId !== session.user.id && userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to remove this member' }, 
        { status: 403 }
      );
    }
    
    // Don't allow removing the owner
    if (userId === group.ownerId) {
      return NextResponse.json(
        { success: false, error: 'The group owner cannot be removed' }, 
        { status: 400 }
      );
    }
    
    // Remove the member
    await prisma.groupMember.delete({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing group member:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove group member' }, 
      { status: 500 }
    );
  }
} 