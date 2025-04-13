import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/me/scopes - Check the current scopes of the Spotify access token
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || !session.accessToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    // Use the token introspection endpoint to get the token's scopes
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
    
    // Get raw token contents to extract scopes (not official API, but works)
    const tokensResponse = await fetch('https://open.spotify.com/get_access_token', {
      headers: {
        'Cookie': `sp_dc=${session.accessToken}`,
      },
    }).catch(() => null);
    
    let scopesInfo = null;
    if (tokensResponse?.ok) {
      try {
        const tokenData = await tokensResponse.json();
        scopesInfo = tokenData.scope || null;
      } catch (e) {
        console.error('Error parsing token data:', e);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'You have an active Spotify access token',
      tokenWorks: true,
      // Include info about how to get new scopes
      tip: "If you need new scopes, sign out and sign back in",
      scopes: scopesInfo,
      // Generate URL to sign out
      signOutUrl: '/api/auth/signout',
    });
  } catch (error) {
    console.error('Error checking token scopes:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to check token scopes'
    }, { status: 500 });
  }
} 