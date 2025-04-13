'use client';

import { useState, useEffect, useRef } from 'react';

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

// Quick reaction defaults
const QUICK_REACTIONS = ['❤️', '🔥', '😍', '🙌', '👏', '💯'];

export function EmojiPicker({ isOpen, onClose, onSelect, anchorRef }: EmojiPickerProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customEmoji, setCustomEmoji] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Position the picker near the anchor element
  useEffect(() => {
    if (isOpen && anchorRef?.current && pickerRef.current) {
      const anchorRect = anchorRef.current.getBoundingClientRect();
      const pickerRect = pickerRef.current.getBoundingClientRect();
      
      // Position above the anchor, centered
      let top = anchorRect.top - pickerRect.height - 12;
      let left = anchorRect.left + (anchorRect.width / 2) - (pickerRect.width / 2);
      
      // Keep within viewport bounds
      if (top < 10) {
        top = anchorRect.bottom + 12;
      }
      if (left < 10) {
        left = 10;
      }
      if (left + pickerRect.width > window.innerWidth - 10) {
        left = window.innerWidth - pickerRect.width - 10;
      }
      
      setPosition({ top, left });
    }
  }, [isOpen, anchorRef, showCustomInput]);

  // Focus input when custom input is shown
  useEffect(() => {
    if (showCustomInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCustomInput]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setShowCustomInput(false);
      setCustomEmoji('');
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleEmojiClick = (emoji: string) => {
    onSelect(emoji);
    onClose();
  };

  const handleCustomSubmit = () => {
    const trimmed = customEmoji.trim();
    if (trimmed) {
      // Take just the first emoji if multiple were entered
      const firstEmoji = [...trimmed][0];
      onSelect(firstEmoji);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCustomSubmit();
    }
  };

  return (
    <div
      ref={pickerRef}
      className="fixed z-[100] animate-in fade-in zoom-in-95 duration-150"
      style={{ top: position.top, left: position.left }}
    >
      {/* iMessage-style bubble */}
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Quick reactions row */}
        <div className="flex items-center gap-1 px-3 py-2.5">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-white/10 rounded-full transition-all hover:scale-125 active:scale-95"
            >
              {emoji}
            </button>
          ))}
          
          {/* Divider */}
          <div className="w-px h-8 bg-white/10 mx-1" />
          
          {/* More button */}
          <button
            onClick={() => setShowCustomInput(!showCustomInput)}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95 ${
              showCustomInput 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'hover:bg-white/10 text-zinc-400 hover:text-white'
            }`}
            title="Choose any emoji"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Custom emoji input */}
        {showCustomInput && (
          <div className="px-3 pb-3 pt-1 border-t border-white/5">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
              Use your emoji keyboard
            </p>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type or paste emoji..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-zinc-500 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              />
              <button
                onClick={handleCustomSubmit}
                disabled={!customEmoji.trim()}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
            <p className="text-[10px] text-zinc-600 mt-1.5">
              💡 Press <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400">⌘</kbd> + <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400">Space</kbd> on Mac
            </p>
          </div>
        )}
      </div>

      {/* Arrow pointing down */}
      <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-4 h-4 bg-zinc-900/95 border-r border-b border-white/10 rotate-45 -z-10" />
    </div>
  );
}
