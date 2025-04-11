'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';

// Types for chat functionality
type Reaction = {
  emoji: string;
  userId: string;
  userName: string;
};

type Message = {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    image?: string;
  };
  timestamp: Date;
  reactions: Reaction[];
};

// Mock data for initial messages
const INITIAL_MESSAGES: Message[] = [
  {
    id: 'msg1',
    content: 'Welcome to VibeSmiths Chat! 👋',
    sender: {
      id: 'system',
      name: 'VibeSmiths',
      image: '/spotify-icon.png',
    },
    timestamp: new Date(Date.now() - 3600000),
    reactions: [],
  },
  {
    id: 'msg2',
    content: 'Chat with other music lovers about your favorite tracks and playlists! 🎵',
    sender: {
      id: 'system',
      name: 'VibeSmiths',
      image: '/spotify-icon.png',
    },
    timestamp: new Date(Date.now() - 3500000),
    reactions: [],
  },
];

// Available emoji reactions
const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎵', '🎧'];

export default function ChatPage() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const [reactionMessage, setReactionMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check authentication
  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/');
    }
  }, [status]);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle message submission
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !session?.user) return;

    const message: Message = {
      id: `msg-${Date.now()}`,
      content: newMessage.trim(),
      sender: {
        id: session.user.id,
        name: session.user.name || 'User',
        image: session.user.image || undefined,
      },
      timestamp: new Date(),
      reactions: [],
    };

    setMessages([...messages, message]);
    setNewMessage('');
  };

  // Handle adding a reaction to a message
  const handleReaction = (messageId: string, emoji: string) => {
    if (!session?.user) return;

    setMessages(prevMessages =>
      prevMessages.map(message => {
        if (message.id === messageId) {
          // Check if user already reacted with this emoji
          const existingReaction = message.reactions.find(
            r => r.userId === session.user!.id && r.emoji === emoji
          );

          // If reaction exists, remove it (toggle off)
          if (existingReaction) {
            return {
              ...message,
              reactions: message.reactions.filter(
                r => !(r.userId === session.user!.id && r.emoji === emoji)
              ),
            };
          }

          // Add new reaction
          return {
            ...message,
            reactions: [
              ...message.reactions,
              {
                emoji,
                userId: session.user!.id,
                userName: session.user!.name || 'User',
              },
            ],
          };
        }
        return message;
      })
    );

    setReactionMessage(null);
  };

  // Format timestamp for displaying in chat
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date);
  };

  // Determine if a message is from the current user
  const isOwnMessage = (message: Message) => {
    return message.sender.id === session?.user?.id;
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-900 to-black">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-zinc-900 to-black">
      {/* Header */}
      <div className="bg-zinc-800 p-4 shadow-md">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
              <span className="text-white text-lg">🎧</span>
            </div>
            <h1 className="text-xl font-bold text-white">Music Lovers Chat</h1>
          </div>
          <Link href="/home">
            <Button variant="outline" size="sm">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>

      {/* Chat container */}
      <div className="flex-1 overflow-y-auto py-6 px-4 max-w-4xl mx-auto w-full">
        <div className="flex flex-col space-y-4">
          {messages.map(message => (
            <div key={message.id} className="w-full">
              {/* Message bubble */}
              <div className={`flex ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}>
                {!isOwnMessage(message) && message.sender.image && (
                  <div className="flex-shrink-0 mr-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      <Image
                        src={message.sender.image}
                        alt={message.sender.name}
                        width={32}
                        height={32}
                      />
                    </div>
                  </div>
                )}

                <div className="max-w-[70%]">
                  {!isOwnMessage(message) && (
                    <div className="text-xs text-zinc-400 ml-2 mb-1">{message.sender.name}</div>
                  )}

                  <div
                    className={`relative p-3 rounded-2xl ${
                      isOwnMessage(message)
                        ? 'bg-green-600 text-white rounded-tr-none'
                        : 'bg-zinc-700 text-white rounded-tl-none'
                    }`}
                    onClick={() =>
                      setReactionMessage(message.id === reactionMessage ? null : message.id)
                    }
                  >
                    <div className="text-sm">{message.content}</div>

                    {/* Reaction popup */}
                    {reactionMessage === message.id && (
                      <div className="absolute bottom-full left-0 mb-2 bg-zinc-800 rounded-full px-2 py-1 shadow-lg flex gap-1 z-10">
                        {EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            className="text-lg hover:scale-125 transition-transform p-1"
                            onClick={e => {
                              e.stopPropagation();
                              handleReaction(message.id, emoji);
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Time */}
                    <div
                      className={`text-[10px] ${isOwnMessage(message) ? 'text-zinc-200' : 'text-zinc-400'} absolute bottom-1 ${isOwnMessage(message) ? 'left-2' : 'right-2'}`}
                    >
                      {formatTime(message.timestamp)}
                    </div>
                  </div>

                  {/* Reactions display */}
                  {message.reactions.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1 items-center">
                      {Array.from(new Set(message.reactions.map(r => r.emoji))).map(emoji => {
                        const count = message.reactions.filter(r => r.emoji === emoji).length;
                        return (
                          <div
                            key={emoji}
                            className="bg-zinc-800 rounded-full px-2 py-0.5 text-xs flex items-center gap-1"
                          >
                            <span>{emoji}</span>
                            <span className="text-zinc-400">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message input */}
      <div className="bg-zinc-800 p-4 border-t border-zinc-700">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-zinc-700 text-white rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-green-600"
          />
          <Button type="submit" variant="spotify" disabled={!newMessage.trim()}>
            Send
          </Button>
        </form>
      </div>
    </main>
  );
}
