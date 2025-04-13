'use client';

import { useState, useRef } from 'react';
import { isEmoji } from '@/lib/emoji';
import { useAuth } from '@/lib/auth-context';
import { EmojiPicker } from './EmojiPicker';

interface Member {
  id: string;
  name: string;
  phone: string | null;
  color: string | null;
  avatarUrl: string | null;
}

interface Reaction {
  id: string;
  emoji: string;
  member: Member;
}

interface Track {
  id: string;
  trackName: string;
  artistName: string;
  albumName: string | null;
  albumImageUrl: string | null;
  spotifyUrl: string | null;
  sentAt: Date | string;
  sender: Member;
  reactions: Reaction[];
}

interface TrackListProps {
  tracks: Track[];
  startIndex?: number;
  showFooter?: boolean;
  onReactionAdded?: (trackId: string, reaction: Reaction) => void;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(date: Date | string) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Sticker placeholder component
function StickerPlaceholder() {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-white/10 rounded text-[10px]">
      🏷️
    </span>
  );
}

// Group consecutive identical emojis/reactions
function groupReactions(reactions: Reaction[]) {
  const grouped: { emoji: string; count: number; reactors: string[]; isSticker: boolean }[] = [];
  const emojiMap = new Map<string, { count: number; reactors: string[]; isSticker: boolean }>();

  for (const reaction of reactions) {
    const existing = emojiMap.get(reaction.emoji);
    const reactionIsSticker = !isEmoji(reaction.emoji);
    
    if (existing) {
      existing.count++;
      existing.reactors.push(reaction.member.name);
    } else {
      emojiMap.set(reaction.emoji, {
        count: 1,
        reactors: [reaction.member.name],
        isSticker: reactionIsSticker,
      });
    }
  }

  for (const [emoji, data] of emojiMap) {
    grouped.push({ emoji, ...data });
  }

  return grouped.sort((a, b) => b.count - a.count);
}

// Tooltip component for reactions
function ReactionWithTooltip({
  emoji,
  count,
  reactors,
  isSticker,
}: {
  emoji: string;
  count: number;
  reactors: string[];
  isSticker: boolean;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Clean up the display text for stickers (remove ~ prefix if present)
  const displayText = emoji.startsWith('~') ? emoji.slice(1) : emoji;

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="text-sm hover:scale-125 transition-transform cursor-default inline-flex items-center gap-0.5">
        {isSticker ? <StickerPlaceholder /> : emoji}
        {count > 1 && (
          <span className="text-xs text-zinc-500 ml-0.5">{count}</span>
        )}
      </span>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap max-w-48">
            <div className="text-center mb-1">
              {isSticker ? (
                <div className="flex flex-col items-center gap-1">
                  <StickerPlaceholder />
                  <span className="text-xs text-zinc-400 truncate max-w-full">
                    {displayText.length > 20 ? displayText.slice(0, 20) + '...' : displayText}
                  </span>
                </div>
              ) : (
                <span className="text-lg">{emoji}</span>
              )}
            </div>
            <div className="text-xs text-zinc-300 space-y-0.5">
              {reactors.map((name, i) => (
                <div key={i} className="text-center">
                  {name}
                </div>
              ))}
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-zinc-900 border-r border-b border-white/10 rotate-45" />
        </div>
      )}
    </span>
  );
}

// Add reaction button with emoji picker
function AddReactionButton({ 
  trackId, 
  onReactionAdded 
}: { 
  trackId: string; 
  onReactionAdded: (reaction: Reaction) => void;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleSelectEmoji = async (emoji: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId, emoji }),
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        onReactionAdded(data.reaction);
      } else {
        // Show error to user
        console.error('Failed to add reaction:', data.error);
        alert(data.error || 'Failed to add reaction. Try logging out and back in.');
      }
    } catch (error) {
      console.error('Failed to add reaction:', error);
      alert('Failed to add reaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsPickerOpen(true)}
        disabled={isSubmitting}
        className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
        title="Add reaction"
      >
        {isSubmitting ? (
          <span className="w-3 h-3 border border-zinc-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        )}
      </button>
      <EmojiPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleSelectEmoji}
        anchorRef={buttonRef}
      />
    </>
  );
}

function TrackRow({ 
  track, 
  index, 
  showAddReaction,
  onReactionAdded,
}: { 
  track: Track; 
  index: number;
  showAddReaction: boolean;
  onReactionAdded: (trackId: string, reaction: Reaction) => void;
}) {
  const [imageError, setImageError] = useState(false);
  const groupedReactions = groupReactions(track.reactions);

  return (
    <>
      {/* Desktop Layout - hidden on mobile */}
      <div className="hidden md:grid grid-cols-[16px_1fr_1fr_1fr_80px] gap-4 px-4 py-3 rounded-lg hover:bg-white/5 transition-colors group items-center">
        {/* Track Number */}
        <span className="text-sm text-zinc-500 group-hover:text-white tabular-nums">
          {index + 1}
        </span>

        {/* Track Info */}
        <div className="flex items-center gap-3 min-w-0">
          {track.albumImageUrl && !imageError ? (
            <img
              src={track.albumImageUrl}
              alt={track.albumName || track.trackName}
              className="w-10 h-10 rounded shadow-lg flex-shrink-0"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-10 h-10 rounded shadow-lg flex-shrink-0 bg-zinc-800 flex items-center justify-center">
              <span className="text-lg">🎵</span>
            </div>
          )}
          <div className="min-w-0">
            {track.spotifyUrl ? (
              <a
                href={track.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-white truncate block group-hover:text-emerald-400 transition-colors hover:underline"
              >
                {track.trackName}
              </a>
            ) : (
              <p className="font-medium text-white truncate group-hover:text-emerald-400 transition-colors">
                {track.trackName}
              </p>
            )}
            <p className="text-sm text-zinc-400 truncate">{track.artistName}</p>
          </div>
        </div>

        {/* Sender */}
        <div className="flex items-center gap-2 min-w-0">
          {track.sender.avatarUrl ? (
            <img
              src={track.sender.avatarUrl}
              alt={track.sender.name}
              className="w-6 h-6 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div
              className={`w-6 h-6 rounded-full bg-gradient-to-br ${track.sender.color || 'from-zinc-500 to-zinc-600'} flex items-center justify-center flex-shrink-0`}
            >
              <span className="text-[10px] font-medium text-white">
                {getInitials(track.sender.name)}
              </span>
            </div>
          )}
          <span className="text-sm text-zinc-300 truncate">
            {track.sender.name}
          </span>
        </div>

        {/* Reactions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {groupedReactions.slice(0, 5).map((reaction, i) => (
            <ReactionWithTooltip
              key={i}
              emoji={reaction.emoji}
              count={reaction.count}
              reactors={reaction.reactors}
              isSticker={reaction.isSticker}
            />
          ))}
          {groupedReactions.length > 5 && (
            <span className="text-xs text-zinc-500">
              +{groupedReactions.length - 5}
            </span>
          )}
          {/* Add reaction button - shows on hover when logged in */}
          {showAddReaction && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <AddReactionButton 
                trackId={track.id} 
                onReactionAdded={(reaction) => onReactionAdded(track.id, reaction)}
              />
            </div>
          )}
        </div>

        {/* Date */}
        <span className="text-sm text-zinc-500 text-right">
          {formatDate(track.sentAt)}
        </span>
      </div>

      {/* Mobile Layout - card style */}
      <div className="md:hidden px-3 py-3 rounded-lg hover:bg-white/5 transition-colors group">
        <div className="flex gap-3">
          {/* Album Art */}
          {track.albumImageUrl && !imageError ? (
            <img
              src={track.albumImageUrl}
              alt={track.albumName || track.trackName}
              className="w-12 h-12 rounded shadow-lg flex-shrink-0"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-12 h-12 rounded shadow-lg flex-shrink-0 bg-zinc-800 flex items-center justify-center">
              <span className="text-xl">🎵</span>
            </div>
          )}

          {/* Track Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {track.spotifyUrl ? (
                  <a
                    href={track.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-white text-sm truncate block hover:text-emerald-400 transition-colors"
                  >
                    {track.trackName}
                  </a>
                ) : (
                  <p className="font-medium text-white text-sm truncate">
                    {track.trackName}
                  </p>
                )}
                <p className="text-xs text-zinc-400 truncate">{track.artistName}</p>
              </div>
              <span className="text-[10px] text-zinc-500 flex-shrink-0">
                {formatDate(track.sentAt)}
              </span>
            </div>

            {/* Sender & Reactions Row */}
            <div className="flex items-center justify-between mt-2 gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {track.sender.avatarUrl ? (
                  <img
                    src={track.sender.avatarUrl}
                    alt={track.sender.name}
                    className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className={`w-4 h-4 rounded-full bg-gradient-to-br ${track.sender.color || 'from-zinc-500 to-zinc-600'} flex items-center justify-center flex-shrink-0`}
                  >
                    <span className="text-[6px] font-medium text-white">
                      {getInitials(track.sender.name)}
                    </span>
                  </div>
                )}
                <span className="text-[10px] text-zinc-400 truncate">
                  {track.sender.name}
                </span>
              </div>

              {/* Reactions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {groupedReactions.slice(0, 3).map((reaction, i) => (
                  <span key={i} className="text-xs">
                    {reaction.isSticker ? '🏷️' : reaction.emoji}
                    {reaction.count > 1 && <span className="text-[10px] text-zinc-500">{reaction.count}</span>}
                  </span>
                ))}
                {groupedReactions.length > 3 && (
                  <span className="text-[10px] text-zinc-500">
                    +{groupedReactions.length - 3}
                  </span>
                )}
                {showAddReaction && (
                  <AddReactionButton 
                    trackId={track.id} 
                    onReactionAdded={(reaction) => onReactionAdded(track.id, reaction)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function TrackList({ 
  tracks, 
  startIndex = 0, 
  showFooter = true,
  onReactionAdded,
}: TrackListProps) {
  const { user } = useAuth();

  // Check if user can add reactions (must be logged in with a linked member)
  const canReact = !!user?.member && !!onReactionAdded;

  if (tracks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {/* Header Row - hidden on mobile */}
      <div className="hidden md:grid grid-cols-[16px_1fr_1fr_1fr_80px] gap-4 px-4 py-2 text-xs font-medium uppercase tracking-wider text-zinc-500 border-b border-white/5">
        <span>#</span>
        <span>Title</span>
        <span>Sent By</span>
        <span>Reactions</span>
        <span className="text-right">Date</span>
      </div>

      {/* Track Rows */}
      {tracks.map((track, index) => (
        <TrackRow 
          key={track.id} 
          track={track} 
          index={startIndex + index} 
          showAddReaction={canReact}
          onReactionAdded={onReactionAdded!}
        />
      ))}

      {/* Footer */}
      {showFooter && (
        <div className="mt-12 pt-8 border-t border-white/5 text-center">
          <p className="text-zinc-500 text-sm">
            Showing {tracks.length} tracks
          </p>
        </div>
      )}
    </div>
  );
}
