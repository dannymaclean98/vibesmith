import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

if (!accountSid || !authToken || !verifyServiceSid) {
  console.error('Twilio credentials not configured. SMS verification will not work.');
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendVerificationCode(phone: string): Promise<{ success: boolean; error?: string }> {
  if (!client || !verifyServiceSid) {
    return { success: false, error: 'SMS verification is not configured' };
  }

  try {
    await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to: `+${phone}`,
        channel: 'sms',
      });
    return { success: true };
  } catch (error) {
    console.error('Failed to send verification code:', error);
    return { success: false, error: 'Failed to send verification code' };
  }
}

export async function checkVerificationCode(
  phone: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  if (!client || !verifyServiceSid) {
    return { success: false, error: 'SMS verification is not configured' };
  }

  try {
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({
        to: `+${phone}`,
        code,
      });

    if (verification.status === 'approved') {
      return { success: true };
    }
    return { success: false, error: 'Invalid verification code' };
  } catch (error) {
    console.error('Failed to verify code:', error);
    return { success: false, error: 'Verification failed' };
  }
}
