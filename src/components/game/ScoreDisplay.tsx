'use client';

interface ScoreDisplayProps {
  correct: number;
  total: number;
  streak: number;
}

export function ScoreDisplay({ correct, total, streak }: ScoreDisplayProps) {
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="flex items-center justify-center gap-4 sm:gap-8 py-4">
      {/* Score */}
      <div className="text-center">
        <div className="text-2xl sm:text-3xl font-bold text-white">
          {correct}/{total}
        </div>
        <div className="text-xs text-zinc-500 uppercase tracking-wide">Score</div>
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-zinc-700" />

      {/* Accuracy */}
      <div className="text-center">
        <div className="text-2xl sm:text-3xl font-bold text-emerald-400">
          {accuracy}%
        </div>
        <div className="text-xs text-zinc-500 uppercase tracking-wide">Accuracy</div>
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-zinc-700" />

      {/* Streak */}
      <div className="text-center">
        <div className="text-2xl sm:text-3xl font-bold text-orange-400 flex items-center justify-center gap-1">
          {streak > 0 && <span className="text-lg">🔥</span>}
          {streak}
        </div>
        <div className="text-xs text-zinc-500 uppercase tracking-wide">Streak</div>
      </div>
    </div>
  );
}

