'use client';

interface ResultRevealProps {
  isCorrect: boolean;
  correctMember: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    color?: string | null;
  };
  onNext: () => void;
}

export function ResultReveal({ isCorrect, correctMember, onNext }: ResultRevealProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className={`
      mt-6 p-6 rounded-xl text-center
      ${isCorrect 
        ? 'bg-emerald-500/10 border border-emerald-500/30' 
        : 'bg-red-500/10 border border-red-500/30'
      }
      animate-in fade-in slide-in-from-bottom-4 duration-300
    `}>
      {/* Result Icon */}
      <div className={`
        w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center
        ${isCorrect ? 'bg-emerald-500' : 'bg-red-500'}
      `}>
        {isCorrect ? (
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>

      {/* Message */}
      <h3 className={`text-xl font-bold mb-2 ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
        {isCorrect ? 'Correct! 🎉' : 'Not quite! 😅'}
      </h3>

      {/* Correct Answer */}
      <p className="text-zinc-400 mb-4">
        {isCorrect ? 'You got it!' : 'It was actually...'}
      </p>

      <div className="flex items-center justify-center gap-3 mb-6">
        {correctMember.avatarUrl ? (
          <img
            src={correctMember.avatarUrl}
            alt={correctMember.name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold"
            style={{ 
              backgroundColor: correctMember.color || '#3f3f46',
              color: 'white',
            }}
          >
            {getInitials(correctMember.name)}
          </div>
        )}
        <span className="text-lg font-semibold text-white">{correctMember.name}</span>
      </div>

      {/* Next Button */}
      <button
        onClick={onNext}
        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold px-8 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-105 active:scale-95"
      >
        Next Track →
      </button>
    </div>
  );
}

