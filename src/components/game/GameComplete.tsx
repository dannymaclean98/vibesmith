'use client';

import Link from 'next/link';

interface GameCompleteProps {
  stats: {
    correct: number;
    total: number;
    accuracy: number;
    bestStreak: number;
  };
  onPlayAgain: () => void;
}

export function GameComplete({ stats, onPlayAgain }: GameCompleteProps) {
  const getMessage = () => {
    if (stats.accuracy >= 90) return { text: 'Perfect! You really know your crew! 🏆', emoji: '🏆' };
    if (stats.accuracy >= 70) return { text: 'Great job! You know your music friends well! 🎉', emoji: '🎉' };
    if (stats.accuracy >= 50) return { text: 'Not bad! Keep listening! 🎵', emoji: '🎵' };
    return { text: 'Room for improvement! Time to pay more attention! 😅', emoji: '😅' };
  };

  const message = getMessage();

  return (
    <div className="text-center py-8">
      {/* Trophy Animation */}
      <div className="text-8xl mb-6 animate-bounce">
        {message.emoji}
      </div>

      <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
        Game Complete!
      </h2>
      
      <p className="text-lg text-zinc-400 mb-8">
        {message.text}
      </p>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
        <div className="bg-zinc-800/50 rounded-xl p-4 border border-white/5">
          <div className="text-3xl font-bold text-white">{stats.correct}/{stats.total}</div>
          <div className="text-sm text-zinc-500">Correct Guesses</div>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-4 border border-white/5">
          <div className="text-3xl font-bold text-emerald-400">{stats.accuracy}%</div>
          <div className="text-sm text-zinc-500">Accuracy</div>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-4 border border-white/5 col-span-2">
          <div className="text-3xl font-bold text-orange-400 flex items-center justify-center gap-2">
            🔥 {stats.bestStreak}
          </div>
          <div className="text-sm text-zinc-500">Best Streak</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={onPlayAgain}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold px-8 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-105 active:scale-95"
        >
          Play Again
        </button>
        <Link
          href="/"
          className="text-zinc-400 hover:text-white transition-colors px-4 py-3"
        >
          Back to Playlist
        </Link>
      </div>
    </div>
  );
}

