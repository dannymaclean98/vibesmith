'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'Callback':
        return 'There was a problem connecting to Spotify. This could be due to an expired session or database connection issues.';
      case 'AccessDenied':
        return 'You denied access to your Spotify account.';
      case 'Configuration':
        return 'There is a problem with the server configuration.';
      case 'OAuthSignin':
        return 'Error occurred during Spotify authentication.';
      case 'OAuthCallback':
        return 'Error occurred during Spotify callback verification.';
      case 'OAuthAccountNotLinked':
        return 'This account is already linked to another provider.';
      case 'EmailSignin':
        return 'Error sending the email verification.';
      case 'CredentialsSignin':
        return 'Sign in failed. Check the details you provided are correct.';
      case 'SessionRequired':
        return 'Please sign in to access this page.';
      default:
        return 'An unexpected error occurred during authentication.';
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-zinc-900 to-black">
      <div className="w-full max-w-md p-8 space-y-8 bg-zinc-800 rounded-xl shadow-xl">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-4">
            Authentication Error
          </h1>

          <div className="p-4 mb-6 bg-red-900/40 border border-red-700 rounded-md text-red-200 text-sm">
            {getErrorMessage(error)}
          </div>

          <p className="text-zinc-400 mb-8">
            Please try signing in again or contact support if the problem persists.
          </p>

          <Link href="/">
            <Button variant="spotify" size="lg">
              Back to Login
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
