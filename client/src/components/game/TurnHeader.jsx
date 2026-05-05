export default function TurnHeader({ currentPlayer, isMyTurn, timeLeft, round, phase }) {
  const label = phase === 'voting'
    ? 'Phase de vote'
    : isMyTurn
    ? '🎯 C\'est ton tour !'
    : `Au tour de : ${currentPlayer || '...'}`;

  return (
    <div style={{ textAlign: 'center', paddingTop: 20, paddingBottom: 8 }}>
      <span style={{
        color: '#7c3aed',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 3,
        textTransform: 'uppercase',
        display: 'block',
        marginBottom: 6,
      }}>
        Round {round}
      </span>

      <span style={{
        color: isMyTurn ? '#c4b5fd' : '#ffffff',
        fontSize: 20,
        fontWeight: 800,
        display: 'block',
        marginBottom: phase === 'voting' ? 0 : 10,
      }}>
        {label}
      </span>

      {/* Barre timer — seulement pendant les tours */}
      {phase === 'playing' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div style={{
            width: 160,
            height: 6,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 99,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${(timeLeft / 15) * 100}%`,
              height: '100%',
              background: timeLeft <= 5 ? '#ef4444' : timeLeft <= 10 ? '#f97316' : '#8b5cf6',
              borderRadius: 99,
              transition: 'width 0.9s linear, background 0.3s',
            }} />
          </div>
          <span style={{
            color: timeLeft <= 5 ? '#ef4444' : '#9ca3af',
            fontSize: 13,
            fontWeight: 700,
            minWidth: 30,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {timeLeft}s
          </span>
        </div>
      )}
    </div>
  );
}
