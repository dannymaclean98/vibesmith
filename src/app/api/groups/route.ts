import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/groups - Get all groups for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's owned groups
    const ownedGroups = await prisma.group.findMany({
      where: { ownerId: session.user.id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                email: true
              }
            }
          }
        }
      }
    });
    
    // Get groups where user is a member (but not owner)
    const memberGroups = await prisma.groupMember.findMany({
      where: { 
        userId: session.user.id,
        group: {
          ownerId: {
            not: session.user.id
          }
        }
      },
      include: {
        group: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                image: true,
                email: true
              }
            },
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      ownedGroups, 
      memberGroups: memberGroups.map(m => m.group) 
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch groups' }, { status: 500 });
  }
}

// POST /api/groups - Create a new group
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const { name, description } = await request.json();
    
    if (!name) {
      return NextResponse.json({ success: false, error: 'Group name is required' }, { status: 400 });
    }
    
    // Create a new group
    const group = await prisma.group.create({
      data: {
        name,
        description,
        ownerId: session.user.id,
        // Add the owner as a member as well
        members: {
          create: {
            userId: session.user.id
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                email: true
              }
            }
          }
        }
      }
    });
    
    return NextResponse.json({ success: true, group }, { status: 201 });
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json({ success: false, error: 'Failed to create group' }, { status: 500 });
  }
} 