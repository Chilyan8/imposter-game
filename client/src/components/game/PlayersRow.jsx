import { useRef } from 'react';
import PlayerCard from './PlayerCard';

export default function PlayersRow({
  players,       // [{pseudo, characterIndex}]
  eliminated,
  currentPlayer,
  myPseudo,
  clues,
  // vote
  voteMode,
  votes,         // [{voter, target}]
  myVote,
  onVote,
  characterMap,  // {pseudo: characterIndex}
}) {
  const rowRef = useRef(null);

  const scroll = (dir) => {
    rowRef.current?.scrollBy({ left: dir * 160, behavior: 'smooth' });
  };

  const activePlayers = players.filter(p => !eliminated.includes(p.pseudo));

  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0 8px' }}>
      {/* Flèche gauche */}
      <button
        onClick={() => scroll(-1)}
        style={{
          flexShrink: 0,
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'rgba(42,20,51,0.8)',
          border: '1px solid rgba(139,92,246,0.3)',
          color: '#a78bfa',
          fontSize: 20,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 6,
        }}
      >‹</button>

      {/* Rangée */}
      <div
        ref={rowRef}
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 12,
          overflowX: 'auto',
          padding: '16px 4px',
          flex: 1,
          justifyContent: activePlayers.length <= 4 ? 'center' : 'flex-start',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {players.map((p) => {
          const clue = clues.find(c => c.pseudo === p.pseudo);
          const votersForThisPlayer = voteMode
            ? votes
                .filter(v => v.target === p.pseudo)
                .map(v => ({ pseudo: v.voter, characterIndex: characterMap[v.voter] ?? 0 }))
            : [];

          return (
            <PlayerCard
              key={p.pseudo}
              pseudo={p.pseudo}
              characterIndex={p.characterIndex}
              word={clue ? (clue.word ?? '⏱') : null}
              isActive={currentPlayer === p.pseudo && !voteMode}
              isMe={p.pseudo === myPseudo}
              isEliminated={eliminated.includes(p.pseudo)}
              voteMode={voteMode}
              voters={votersForThisPlayer}
              totalActive={activePlayers.length}
              hasVoted={!!myVote}
              onVote={() => onVote?.(p.pseudo)}
            />
          );
        })}
      </div>

      {/* Flèche droite */}
      <button
        onClick={() => scroll(1)}
        style={{
          flexShrink: 0,
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'rgba(42,20,51,0.8)',
          border: '1px solid rgba(139,92,246,0.3)',
          color: '#a78bfa',
          fontSize: 20,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 6,
        }}
      >›</button>
    </div>
  );
}
