import { useRef } from 'react';
import PlayerCard from './PlayerCard';

export default function PlayersRow({ players, currentPlayer, myPseudo, clues, eliminated }) {
  const rowRef = useRef(null);

  const scroll = (dir) => {
    if (rowRef.current) {
      rowRef.current.scrollBy({ left: dir * 160, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative flex items-center w-full px-2">
      {/* Flèche gauche */}
      <button
        onClick={() => scroll(-1)}
        className="flex-shrink-0 z-10 flex items-center justify-center rounded-full transition-colors mr-2"
        style={{
          width: 36,
          height: 36,
          background: 'rgba(42,20,51,0.8)',
          border: '1px solid rgba(139,92,246,0.3)',
          color: '#a78bfa',
          fontSize: 18,
        }}
        aria-label="Précédent"
      >
        ‹
      </button>

      {/* Ligne des joueurs */}
      <div
        ref={rowRef}
        className="flex flex-row gap-4 overflow-x-auto scrollbar-hide py-4 flex-1"
        style={{ justifyContent: players.length <= 4 ? 'center' : 'flex-start' }}
      >
        {players.map((pseudo) => {
          const clue = clues.find((c) => c.pseudo === pseudo);
          return (
            <PlayerCard
              key={pseudo}
              pseudo={pseudo}
              word={clue?.word || null}
              isActive={currentPlayer === pseudo}
              isCurrentUser={myPseudo === pseudo}
              isEliminated={eliminated?.includes(pseudo)}
            />
          );
        })}
      </div>

      {/* Flèche droite */}
      <button
        onClick={() => scroll(1)}
        className="flex-shrink-0 z-10 flex items-center justify-center rounded-full transition-colors ml-2"
        style={{
          width: 36,
          height: 36,
          background: 'rgba(42,20,51,0.8)',
          border: '1px solid rgba(139,92,246,0.3)',
          color: '#a78bfa',
          fontSize: 18,
        }}
        aria-label="Suivant"
      >
        ›
      </button>
    </div>
  );
}
