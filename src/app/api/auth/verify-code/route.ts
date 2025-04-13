import { NextRequest, NextResponse } from 'next/server';
import { checkVerificationCode } from '@/lib/twilio';
import { createSession, setSessionCookie, normalizePhone } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();

    if (!phone || !code) {
      return NextResponse.json(
        { error: 'Phone number and code are required' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone);

    // Verify the code with Twilio
    const result = await checkVerificationCode(normalizedPhone, code);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Invalid code' },
        { status: 400 }
      );
    }

    // Find or create user
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { phone: normalizedPhone },
        include: { member: true },
      });

      if (!user) {
        // Check if there's a member with this phone number
        const member = await prisma.member.findUnique({
          where: { phone: normalizedPhone },
        });

        // Create new user, linking to member if found
        user = await prisma.user.create({
          data: {
            phone: normalizedPhone,
            memberId: member?.id,
          },
          include: { member: true },
        });
      } else if (!user.memberId) {
        // User exists but isn't linked to a member - try to link now
        const member = await prisma.member.findUnique({
          where: { phone: normalizedPhone },
        });

        if (member) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { memberId: member.id },
            include: { member: true },
          });
        }
      }
    } catch (dbError) {
      console.error('Database error during user lookup/creation:', dbError);
      // Phone verified successfully but couldn't create/find user in database
      // Return success but indicate they need to try again later
      return NextResponse.json({
        success: true,
        verified: true,
        user: null,
        message: 'Phone verified! Please try logging in again.',
      });
    }

    // Create session
    const sessionToken = await createSession(user.id);
    await setSessionCookie(sessionToken);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        member: user.member,
      },
    });
  } catch (error) {
    console.error('Error in verify-code:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
