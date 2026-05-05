import Avatar from './Avatar';

export default function PlayerCard({ pseudo, word, isActive, isCurrentUser, isEliminated }) {
  return (
    <div
      className="flex flex-col items-center gap-3 px-5 py-5 rounded-2xl transition-all duration-200 select-none"
      style={{
        background: isActive ? 'rgba(139,92,246,0.18)' : 'rgba(42,20,51,0.7)',
        border: isActive
          ? '2px solid #8b5cf6'
          : isCurrentUser
          ? '2px solid rgba(139,92,246,0.3)'
          : '2px solid rgba(255,255,255,0.05)',
        transform: isActive ? 'scale(1.08)' : 'scale(1)',
        opacity: isEliminated ? 0.35 : 1,
        minWidth: 110,
        maxWidth: 140,
      }}
    >
      {/* Avatar */}
      <div className="relative">
        <Avatar pseudo={pseudo} size={64} />
        {isActive && (
          <span
            className="absolute -top-1 -right-1 text-xs"
            title="Son tour"
          >
            🎯
          </span>
        )}
        {isEliminated && (
          <span className="absolute -top-1 -right-1 text-xs">❌</span>
        )}
      </div>

      {/* Pseudo */}
      <span
        className="font-bold text-white text-center leading-tight"
        style={{
          fontSize: 15,
          maxWidth: 120,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {pseudo}
        {isCurrentUser && (
          <span style={{ fontSize: 10, color: '#a78bfa', display: 'block', fontWeight: 400 }}>
            (toi)
          </span>
        )}
      </span>

      {/* Mot écrit */}
      <span
        style={{
          fontSize: 13,
          color: word && word !== '...' ? '#ffffff' : '#6b7280',
          background: word && word !== '...' ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
          border: word && word !== '...' ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
          padding: '3px 10px',
          fontWeight: word && word !== '...' ? 600 : 400,
          minWidth: 60,
          textAlign: 'center',
        }}
      >
        {word || '...'}
      </span>
    </div>
  );
}
