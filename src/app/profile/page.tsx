'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, isLoading, refresh } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.member?.name || '');
      setAvatarUrl(user.avatarUrl || user.member?.avatarUrl || '');
    }
  }, [user]);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to upload image' });
      } else {
        setAvatarUrl(data.avatarUrl);
        setMessage({ type: 'success', text: 'Photo uploaded! Don\'t forget to save.' });
      }
    } catch (error) {
      console.error('Failed to upload:', error);
      setMessage({ type: 'error', text: 'Failed to upload image' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      uploadFile(file);
    } else {
      setMessage({ type: 'error', text: 'Please drop an image file' });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          avatarUrl: avatarUrl.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        await refresh();
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      setMessage({ type: 'error', text: 'Something went wrong' });
    } finally {
      setIsSaving(false);
    }
  };

  const formatPhone = (phone: string) => {
    if (phone.length === 11 && phone.startsWith('1')) {
      return `(${phone.slice(1, 4)}) ${phone.slice(4, 7)}-${phone.slice(7)}`;
    }
    return phone;
  };

  const removeAvatar = () => {
    setAvatarUrl('');
    setMessage({ type: 'success', text: 'Photo removed. Don\'t forget to save.' });
  };

  if (isLoading) {
    return (
      <main className="max-w-2xl mx-auto py-8 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-zinc-800 rounded w-48 mb-8"></div>
          <div className="h-64 bg-zinc-800 rounded"></div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="max-w-2xl mx-auto py-8 px-4">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8"
      >
        <span>←</span>
        <span>Back to Playlist</span>
      </Link>

      <h1 className="text-3xl font-black tracking-tight mb-2">Your Profile</h1>
      <p className="text-zinc-400 mb-8">
        Customize how you appear in the playlist
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Phone Number (read-only) */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Phone Number
          </label>
          <div className="flex items-center gap-3">
            <span className="text-zinc-500">+1</span>
            <span className="text-white">{formatPhone(user.phone)}</span>
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
              ✓ Verified
            </span>
          </div>
        </div>

        {/* Avatar Upload */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Profile Photo
          </label>
          
          <div className="flex items-start gap-4">
            {/* Current Avatar Preview */}
            <div className="flex-shrink-0">
              {avatarUrl ? (
                <div className="relative group">
                  <img
                    src={avatarUrl}
                    alt="Your avatar"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {(displayName || user.phone).slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-white/10 hover:border-white/20 hover:bg-white/5'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {isUploading ? (
                <div className="flex items-center justify-center gap-2 text-zinc-400">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Uploading...</span>
                </div>
              ) : (
                <>
                  <div className="text-3xl mb-2">📷</div>
                  <p className="text-sm text-zinc-400">
                    <span className="text-emerald-400">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    PNG, JPG, GIF or WebP (max 5MB)
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-zinc-300 mb-2">
            Display Name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your name"
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
          <p className="text-xs text-zinc-500 mt-2">
            This is how you&apos;ll appear throughout the playlist
          </p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-4 rounded-xl ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-zinc-600 disabled:to-zinc-600 text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25 disabled:shadow-none"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </main>
  );
}
