import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST() {
  try {
    // Clear all data in reverse order of dependencies
    console.log('Clearing database...');
    
    // Clear all session and authentication related data
    await prisma.session.deleteMany();
    await prisma.verificationToken.deleteMany();
    await prisma.account.deleteMany();
    await prisma.token.deleteMany();
    
    // Clear application data
    await prisma.likedTrack.deleteMany();
    await prisma.groupMember.deleteMany();
    await prisma.group.deleteMany();
    await prisma.user.deleteMany();
    
    // Create response and clear cookies
    const response = NextResponse.json({ success: true });
    
    // Clear all auth-related cookies
    response.cookies.delete('next-auth.session-token');
    response.cookies.delete('next-auth.csrf-token');
    response.cookies.delete('next-auth.callback-url');
    response.cookies.delete('__Secure-next-auth.session-token');
    response.cookies.delete('__Secure-next-auth.callback-url');
    response.cookies.delete('__Host-next-auth.csrf-token');
    
    return response;
  } catch (error) {
    console.error('Error resetting application:', error);
    return NextResponse.json({ success: false, error: 'Failed to reset application' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 