export default function TurnHeader({ currentPlayer, isMyTurn, timeLeft, round }) {
  return (
    <div className="flex flex-col items-center gap-1 pt-6 pb-2">
      <span style={{ color: '#a78bfa', fontSize: 12, fontWeight: 500, letterSpacing: 2, textTransform: 'uppercase' }}>
        Round {round}
      </span>
      <div className="flex items-center gap-2 mt-1">
        <span style={{ color: '#d1d5db', fontSize: 18, fontWeight: 500 }}>
          Au tour de :
        </span>
        <span style={{
          color: isMyTurn ? '#a78bfa' : '#ffffff',
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: -0.5,
        }}>
          {isMyTurn ? 'toi !' : currentPlayer}
        </span>
      </div>

      {/* Timer */}
      <div className="mt-2 flex items-center gap-2">
        <div
          style={{
            width: 180,
            height: 6,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 99,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${(timeLeft / 15) * 100}%`,
              height: '100%',
              background: timeLeft <= 5 ? '#f87171' : timeLeft <= 10 ? '#fb923c' : '#8b5cf6',
              borderRadius: 99,
              transition: 'width 0.9s linear, background 0.3s',
            }}
          />
        </div>
        <span style={{
          color: timeLeft <= 5 ? '#f87171' : '#d1d5db',
          fontSize: 14,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          minWidth: 28,
        }}>
          {timeLeft}s
        </span>
      </div>
    </div>
  );
}
