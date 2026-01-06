'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrackCard } from './TrackCard';
import { MemberOptions } from './MemberOptions';
import { ScoreDisplay } from './ScoreDisplay';
import { ResultReveal } from './ResultReveal';
import { GameComplete } from './GameComplete';

interface Track {
  id: string;
  name: string;
  artist: string;
  album?: string | null;
  albumArt?: string | null;
  spotifyUrl?: string | null;
}

interface Member {
  id: string;
  name: string;
  avatarUrl?: string | null;
  color?: string | null;
}

interface GameRound {
  track: Track;
  members: Member[];
  progress: {
    guessed: number;
    total: number;
    remaining: number;
  };
}

interface GuessResult {
  isCorrect: boolean;
  correctMember: Member;
  score: {
    correct: number;
    total: number;
    streak: number;
  };
}

interface GameStats {
  correct: number;
  total: number;
  accuracy: number;
  bestStreak: number;
}

type GameState = 'loading' | 'playing' | 'revealed' | 'complete';

export function GameContainer() {
  const [gameState, setGameState] = useState<GameState>('loading');
  const [round, setRound] = useState<GameRound | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [result, setResult] = useState<GuessResult | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0, streak: 0 });
  const [finalStats, setFinalStats] = useState<GameStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRound = useCallback(async () => {
    setGameState('loading');
    setSelectedMemberId(null);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/game/round');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch round');
      }

      if (data.complete) {
        // Fetch final stats
        const statsRes = await fetch('/api/game/stats');
        const statsData = await statsRes.json();
        setFinalStats({
          correct: statsData.correctGuesses,
          total: statsData.totalRounds,
          accuracy: statsData.accuracy,
          bestStreak: statsData.bestStreak,
        });
        setGameState('complete');
      } else {
        setRound(data);
        setGameState('playing');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setGameState('playing');
    }
  }, []);

  const submitGuess = async (memberId: string) => {
    if (!round || gameState !== 'playing') return;

    setSelectedMemberId(memberId);

    try {
      const res = await fetch('/api/game/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: round.track.id,
          guessedMemberId: memberId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit guess');
      }

      setResult(data);
      setScore(data.score);
      setGameState('revealed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit guess');
    }
  };

  const handleNextRound = () => {
    fetchRound();
  };

  const handlePlayAgain = async () => {
    // Reset the game by fetching a new round
    // Note: This will only work if there are tracks to guess
    // In a real implementation, you might want to add a "reset game" API
    setScore({ correct: 0, total: 0, streak: 0 });
    setFinalStats(null);
    fetchRound();
  };

  useEffect(() => {
    fetchRound();
  }, [fetchRound]);

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-4">{error}</div>
        <button
          onClick={fetchRound}
          className="text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (gameState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-zinc-400">Loading next track...</p>
      </div>
    );
  }

  if (gameState === 'complete' && finalStats) {
    return (
      <GameComplete 
        stats={finalStats} 
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  if (!round) {
    return (
      <div className="text-center py-12 text-zinc-400">
        No tracks available to play.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Score Display */}
      <ScoreDisplay 
        correct={score.correct} 
        total={score.total} 
        streak={score.streak} 
      />

      {/* Progress Bar */}
      <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full transition-all duration-500"
          style={{ 
            width: `${(round.progress.guessed / round.progress.total) * 100}%` 
          }}
        />
      </div>
      <p className="text-center text-sm text-zinc-500">
        {round.progress.guessed} of {round.progress.total} tracks guessed
      </p>

      {/* Track Card */}
      <TrackCard track={round.track} />

      {/* Member Options */}
      <MemberOptions
        members={round.members}
        onSelect={submitGuess}
        disabled={gameState === 'revealed'}
        selectedId={selectedMemberId}
        correctId={result?.correctMember.id}
      />

      {/* Result Reveal */}
      {gameState === 'revealed' && result && (
        <ResultReveal
          isCorrect={result.isCorrect}
          correctMember={result.correctMember}
          onNext={handleNextRound}
        />
      )}
    </div>
  );
}

