import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationCode } from '@/lib/twilio';
import { normalizePhone } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone);

    // Validate phone format (should be 11 digits for US numbers with country code)
    if (normalizedPhone.length < 10 || normalizedPhone.length > 15) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    const result = await sendVerificationCode(normalizedPhone);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send code' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      phone: normalizedPhone,
      message: 'Verification code sent',
    });
  } catch (error) {
    console.error('Error in send-code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

