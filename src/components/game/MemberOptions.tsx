'use client';

interface Member {
  id: string;
  name: string;
  avatarUrl?: string | null;
  color?: string | null;
}

interface MemberOptionsProps {
  members: Member[];
  onSelect: (memberId: string) => void;
  disabled?: boolean;
  selectedId?: string | null;
  correctId?: string | null;
}

export function MemberOptions({ 
  members, 
  onSelect, 
  disabled = false,
  selectedId,
  correctId,
}: MemberOptionsProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getMemberStyle = (member: Member) => {
    if (!selectedId) return '';
    
    if (member.id === correctId) {
      return 'ring-4 ring-emerald-500 bg-emerald-500/20';
    }
    
    if (member.id === selectedId && member.id !== correctId) {
      return 'ring-4 ring-red-500 bg-red-500/20 opacity-60';
    }
    
    if (selectedId) {
      return 'opacity-40';
    }
    
    return '';
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
      {members.map((member) => (
        <button
          key={member.id}
          onClick={() => !disabled && onSelect(member.id)}
          disabled={disabled}
          className={`
            group flex flex-col items-center p-4 rounded-xl
            bg-zinc-800/50 hover:bg-zinc-800 border border-white/5 hover:border-white/10
            transition-all duration-200
            ${disabled ? 'cursor-default' : 'cursor-pointer hover:scale-105 active:scale-95'}
            ${getMemberStyle(member)}
          `}
        >
          {/* Avatar */}
          <div className="relative mb-3">
            {member.avatarUrl ? (
              <img
                src={member.avatarUrl}
                alt={member.name}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover"
              />
            ) : (
              <div 
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-lg font-semibold"
                style={{ 
                  backgroundColor: member.color || '#3f3f46',
                  color: 'white',
                }}
              >
                {getInitials(member.name)}
              </div>
            )}
            
            {/* Result indicators */}
            {selectedId && member.id === correctId && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {selectedId && member.id === selectedId && member.id !== correctId && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>

          {/* Name */}
          <span className="text-sm text-zinc-300 group-hover:text-white transition-colors text-center line-clamp-1">
            {member.name}
          </span>
        </button>
      ))}
    </div>
  );
}

