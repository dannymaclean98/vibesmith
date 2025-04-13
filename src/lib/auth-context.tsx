'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface Member {
  id: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  color: string | null;
}

interface User {
  id: string;
  phone: string;
  displayName: string | null;
  avatarUrl: string | null;
  member: Member | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (phone: string, code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  sendCode: (phone: string) => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setUser(data.user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sendCode = async (phone: string) => {
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        return { success: false, error: data.error };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to send code:', error);
      return { success: false, error: 'Failed to send verification code' };
    }
  };

  const login = async (phone: string, code: string) => {
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        return { success: false, error: data.error };
      }
      
      // If verification succeeded but user creation failed, still redirect home
      if (data.success) {
        if (data.user) {
          setUser(data.user);
        }
        return { success: true };
      }
      
      return { success: false, error: 'Verification failed' };
    } catch (error) {
      console.error('Failed to login:', error);
      return { success: false, error: 'Failed to verify code' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, sendCode, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

