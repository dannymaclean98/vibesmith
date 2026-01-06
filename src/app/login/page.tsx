'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

type Step = 'phone' | 'verify';

function LoginForm() {
  const { sendCode, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const formatPhoneForDisplay = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      setIsLoading(false);
      return;
    }

    const result = await sendCode(phone);
    setIsLoading(false);

    if (result.success) {
      setStep('verify');
    } else {
      setError(result.error || 'Failed to send code');
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (code.length !== 6) {
      setError('Please enter the 6-digit code');
      setIsLoading(false);
      return;
    }

    const result = await login(phone, code);
    setIsLoading(false);

    if (result.success) {
      // Redirect to the page they were trying to access, or home
      router.push(redirectTo);
    } else {
      setError(result.error || 'Invalid code');
    }
  };

  return (
    <main className="min-h-[calc(100vh-73px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/25">
              <span className="text-3xl">📱</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {step === 'phone' ? 'Login' : 'Enter Code'}
            </h1>
            <p className="text-zinc-400 text-sm">
              {step === 'phone'
                ? 'Enter your phone number to verify your identity'
                : `We sent a code to ${formatPhoneForDisplay(phone)}`}
            </p>
          </div>

          {/* Form */}
          {step === 'phone' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-zinc-300 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    +1
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    value={formatPhoneForDisplay(phone)}
                    onChange={handlePhoneChange}
                    placeholder="(555) 123-4567"
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 pl-12 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    autoComplete="tel"
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading || phone.length !== 10}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-zinc-600 disabled:to-zinc-600 text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25 disabled:shadow-none"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </span>
                ) : (
                  'Send Verification Code'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-zinc-300 mb-2">
                  Verification Code
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[0.5em] font-mono placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading || code.length !== 6}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-zinc-600 disabled:to-zinc-600 text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25 disabled:shadow-none"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  'Verify & Continue'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setCode('');
                  setError('');
                }}
                className="w-full text-zinc-400 hover:text-white text-sm py-2 transition-colors"
              >
                ← Use a different number
              </button>
            </form>
          )}

        </div>

        {/* Info text */}
        <p className="text-zinc-500 text-xs text-center mt-6">
          Your phone number is only used to verify your identity in the group chat.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-[calc(100vh-73px)] flex items-center justify-center px-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
