import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/me/spotify - Get current user's Spotify profile info
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || !session.accessToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's profile from Spotify API
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
      },
    });
    
    if (!profileResponse.ok) {
      const error = await profileResponse.json();
      return NextResponse.json({
        success: false,
        error: error.error?.message || 'Failed to fetch Spotify profile'
      }, { status: profileResponse.status });
    }
    
    const spotifyProfile = await profileResponse.json();
    
    // Get token information including scopes
    const tokenInfoResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
      },
    });
    
    let tokenInfo = null;
    if (tokenInfoResponse.ok) {
      tokenInfo = await tokenInfoResponse.json();
    }
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { tokens: true }
    });
    
    return NextResponse.json({
      success: true,
      spotifyProfile,
      tokenInfo: {
        accessToken: session.accessToken?.slice(0, 10) + '...',
        expiresAt: user?.tokens?.expiresAt,
      },
      currentUser: {
        ...user,
        tokens: undefined, // Don't expose full tokens
      }
    });
  } catch (error) {
    console.error('Error fetching Spotify profile:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch Spotify profile' }, { status: 500 });
  }
}

// POST /api/me/spotify - Update current user's Spotify ID
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || !session.accessToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's profile from Spotify API
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({
        success: false,
        error: error.error?.message || 'Failed to fetch Spotify profile'
      }, { status: response.status });
    }
    
    const spotifyProfile = await response.json();
    
    if (!spotifyProfile.id) {
      return NextResponse.json({
        success: false,
        error: 'Spotify ID not found in profile'
      }, { status: 400 });
    }
    
    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { spotifyId: spotifyProfile.id },
    });
    
    return NextResponse.json({
      success: true,
      spotifyId: spotifyProfile.id,
      user: {
        ...updatedUser,
        // Don't expose sensitive data
        password: undefined,
      }
    });
  } catch (error) {
    console.error('Error updating Spotify ID:', error);
    return NextResponse.json({ success: false, error: 'Failed to update Spotify ID' }, { status: 500 });
  }
} 