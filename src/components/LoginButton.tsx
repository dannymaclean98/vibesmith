'use client';

import { signIn, signOut } from 'next-auth/react';
import { Button } from './ui/Button';
import { useState } from 'react';

interface LoginButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: any;
  size?: any;
  fullWidth?: boolean;
}

export function LoginButton({ children, ...props }: LoginButtonProps) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);

    try {
      // Try to sign out first to clear any existing sessions
      await signOut({ redirect: false });

      // Then sign in with Spotify
      await signIn('spotify', { callbackUrl: '/home' });
    } catch (error) {
      console.error('Login error:', error);
      setIsLoggingIn(false);
    }
  };

  return (
    <Button {...props} onClick={handleLogin} disabled={isLoggingIn}>
      {isLoggingIn ? 'Connecting...' : children}
    </Button>
  );
}
