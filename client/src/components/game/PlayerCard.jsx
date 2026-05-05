import Avatar from './Avatar';

export default function PlayerCard({
  pseudo,
  characterIndex,
  word,          // mot soumis (null = pas encore)
  isActive,      // c'est son tour
  isMe,          // c'est moi
  isEliminated,
  // vote
  voteMode,      // true = phase de vote
  voters,        // [{pseudo, characterIndex}] qui ont voté contre ce joueur
  totalActive,   // nb joueurs actifs (pour les cases vides)
  hasVoted,      // moi j'ai déjà voté
  onVote,        // callback vote
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '12px 10px 10px',
        borderRadius: 18,
        background: isActive
          ? 'rgba(139,92,246,0.18)'
          : isMe
          ? 'rgba(109,40,217,0.12)'
          : 'rgba(42,20,51,0.6)',
        border: isActive
          ? '2px solid #8b5cf6'
          : isMe
          ? '2px solid rgba(139,92,246,0.4)'
          : '2px solid rgba(255,255,255,0.05)',
        transform: isActive ? 'scale(1.07)' : 'scale(1)',
        transition: 'all 0.2s ease',
        opacity: isEliminated ? 0.3 : 1,
        minWidth: 100,
        maxWidth: 120,
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* Indicateur tour actif */}
      {isActive && (
        <div style={{
          position: 'absolute',
          top: -10,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 18,
          lineHeight: 1,
        }}>🎯</div>
      )}

      {/* Avatar */}
      <Avatar characterIndex={characterIndex} pseudo={pseudo} size={64} />

      {/* Pseudo */}
      <span style={{
        color: isMe ? '#c4b5fd' : '#ffffff',
        fontWeight: 700,
        fontSize: 13,
        textAlign: 'center',
        maxWidth: 100,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
      }}>
        {pseudo}
        {isMe && <span style={{ color: '#a78bfa', fontSize: 10, display: 'block', fontWeight: 400 }}>toi</span>}
      </span>

      {/* Mot soumis */}
      {!voteMode && (
        <div style={{
          background: word
            ? 'rgba(139,92,246,0.25)'
            : 'rgba(255,255,255,0.04)',
          border: word
            ? '1px solid rgba(139,92,246,0.5)'
            : '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
          padding: '3px 10px',
          fontSize: 12,
          fontWeight: word ? 700 : 400,
          color: word ? '#fff' : '#4b5563',
          minWidth: 56,
          textAlign: 'center',
          minHeight: 24,
        }}>
          {word ?? '...'}
        </div>
      )}

      {/* Zone de vote */}
      {voteMode && !isEliminated && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: '100%' }}>
          {/* Cases de vote */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center', minHeight: 28 }}>
            {Array.from({ length: totalActive - 1 }).map((_, i) => {
              const voter = voters[i];
              return (
                <div
                  key={i}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: voter ? 'transparent' : 'rgba(255,255,255,0.08)',
                    border: voter ? 'none' : '1px dashed rgba(255,255,255,0.2)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {voter && (
                    <Avatar characterIndex={voter.characterIndex} pseudo={voter.pseudo} size={24} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Bouton voter */}
          {!isMe && !hasVoted && (
            <button
              onClick={onVote}
              style={{
                background: 'rgba(139,92,246,0.3)',
                border: '1px solid rgba(139,92,246,0.6)',
                color: '#c4b5fd',
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                marginTop: 2,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.55)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(139,92,246,0.3)'}
            >
              Voter
            </button>
          )}
          {!isMe && hasVoted && (
            <span style={{ color: '#6b7280', fontSize: 10, marginTop: 2 }}>voté</span>
          )}
        </div>
      )}
    </div>
  );
}
