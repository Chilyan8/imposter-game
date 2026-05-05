import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import GameLayout from '../components/game/GameLayout';
import TurnHeader from '../components/game/TurnHeader';
import PlayersRow from '../components/game/PlayersRow';
import CarouselNavigation from '../components/game/CarouselNavigation';
import Avatar from '../components/game/Avatar';

export default function Game() {
  const { code } = useParams();
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  // Joueurs
  const [allPlayers, setAllPlayers] = useState([]);   // [{pseudo, characterIndex}]
  const [eliminated, setEliminated] = useState([]);
  const [characterMap, setCharacterMap] = useState({}); // {pseudo: characterIndex}

  // Secret du joueur local
  const [mySecret, setMySecret] = useState(null);     // {word, theme, round}
  const [secretConfirmed, setSecretConfirmed] = useState(false);

  // Jeu
  const [phase, setPhase] = useState('waiting');
  const [round, setRound] = useState(1);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [totalTurns, setTotalTurns] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [clues, setClues] = useState([]);
  const [clueInput, setClueInput] = useState('');

  // Vote
  const [votes, setVotes] = useState([]);   // [{voter, target}]
  const [myVote, setMyVote] = useState(null);

  // Résultats
  const [eliminatedInfo, setEliminatedInfo] = useState(null);
  const [endResult, setEndResult] = useState(null);
  const [tieInfo, setTieInfo] = useState(null);

  const isMyTurn = currentPlayer === user?.pseudo && phase === 'playing';

  useEffect(() => {
    socket.emit('game:join', { code, pseudo: user?.pseudo });
    socket.emit('game:init', { code });

    socket.on('game:players', ({ allPlayers, eliminated, round }) => {
      setAllPlayers(allPlayers);
      setEliminated(eliminated || []);
      setRound(round || 1);
      const map = {};
      allPlayers.forEach(p => { map[p.pseudo] = p.characterIndex; });
      setCharacterMap(map);
    });

    socket.on('game:secret', ({ word, theme, round }) => {
      setMySecret({ word, theme, round });
      setSecretConfirmed(false);
      setClues([]);
      setVotes([]);
      setMyVote(null);
      setEliminatedInfo(null);
      setTieInfo(null);
    });

    socket.on('game:turn', ({ currentPlayer, turnIndex, totalTurns, timeLeft, clues }) => {
      setPhase('playing');
      setCurrentPlayer(currentPlayer);
      setTurnIndex(turnIndex);
      setTotalTurns(totalTurns);
      setTimeLeft(timeLeft);
      setClues(clues || []);
      setClueInput('');
      if (currentPlayer === user?.pseudo) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    });

    socket.on('game:timer', ({ timeLeft }) => setTimeLeft(timeLeft));

    socket.on('game:clue', ({ pseudo, word }) => {
      setClues(prev => {
        if (prev.find(c => c.pseudo === pseudo)) return prev;
        return [...prev, { pseudo, word }];
      });
    });

    socket.on('game:vote_phase', ({ activePlayers, clues }) => {
      setPhase('voting');
      setClues(clues || []);
      setVotes([]);
      setMyVote(null);
    });

    socket.on('game:all_played', ({ clues }) => {
      setClues(clues || []);
      setPhase('all_played');
    });

    socket.on('game:votes_update', ({ votes }) => {
      setVotes(votes || []);
    });

    socket.on('game:tie', ({ counts }) => {
      setTieInfo(counts);
      setPhase('tie');
    });

    socket.on('game:restart_turn', ({ clues, eliminated }) => {
      setPhase('playing');
      setClues(clues || []);
      setEliminated(eliminated || []);
      setTieInfo(null);
      setVotes([]);
      setMyVote(null);
    });

    socket.on('game:eliminated', ({ pseudo, role, counts, eliminated }) => {
      setEliminatedInfo({ pseudo, role, counts });
      setEliminated(eliminated || []);
      setPhase('eliminated');
    });

    socket.on('game:continue', ({ eliminated, round, clues }) => {
      setEliminated(eliminated || []);
      setRound(round);
      setClues(clues || []);
      setVotes([]);
      setMyVote(null);
      setEliminatedInfo(null);
      setPhase('playing');
    });

    socket.on('game:end', ({ winner, word, players }) => {
      setEndResult({ winner, word, players });
      setPhase('end');
    });

    return () => {
      ['game:players', 'game:secret', 'game:turn', 'game:timer', 'game:clue',
       'game:vote_phase', 'game:votes_update', 'game:tie', 'game:restart_turn',
       'game:eliminated', 'game:continue', 'game:end'].forEach(e => socket.off(e));
    };
  }, [code, socket, user?.pseudo]);

  const handleReady = () => {
    setSecretConfirmed(true);
    socket.emit('game:ready', { code });
  };

  const handleSubmitClue = (e) => {
    e.preventDefault();
    if (!clueInput.trim() || !isMyTurn) return;
    socket.emit('game:submit_clue', { code, word: clueInput.trim() });
    setClueInput('');
  };

  const handleVote = (target) => {
    if (myVote || target === user?.pseudo) return;
    setMyVote(target);
    socket.emit('game:vote', { code, target });
  };

  const myCharacterIndex = characterMap[user?.pseudo] ?? 0;

  // ─── SECRET REVEAL ────────────────────────────────────────────────────────
  if (mySecret && !secretConfirmed) {
    const isLegit = !!mySecret.word;

    return (
      <GameLayout>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 320, textAlign: 'center' }}>
            <p style={{ color: '#7c3aed', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20 }}>
              Round {mySecret.round} — Ton secret
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <Avatar characterIndex={myCharacterIndex} pseudo={user?.pseudo} size={90} />
            </div>

            <div style={{
              background: isLegit ? 'rgba(109,40,217,0.2)' : 'rgba(42,20,51,0.8)',
              border: isLegit ? '2px solid #7c3aed' : '2px solid rgba(255,255,255,0.1)',
              borderRadius: 20,
              padding: '28px 24px',
              marginBottom: 24,
            }}>
              {isLegit ? (
                <>
                  <p style={{ color: '#a78bfa', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
                    Ton mot secret
                  </p>
                  <p style={{ color: '#fff', fontSize: 38, fontWeight: 900, marginBottom: 8 }}>
                    {mySecret.word}
                  </p>
                  <p style={{ color: '#c4b5fd', fontSize: 13 }}>
                    Donne des mots en rapport sans le révéler directement.
                  </p>
                </>
              ) : (
                <>
                  <p style={{ color: '#9ca3af', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
                    Ton indice
                  </p>
                  <p style={{ color: '#fff', fontSize: 26, fontWeight: 800, marginBottom: 8 }}>
                    {mySecret.theme}
                  </p>
                  <p style={{ color: '#9ca3af', fontSize: 13 }}>
                    Blends-toi parmi les autres sans te faire repérer.
                  </p>
                </>
              )}
            </div>

            <button
              onClick={handleReady}
              style={{
                width: '100%',
                background: '#7c3aed',
                color: '#fff',
                fontWeight: 800,
                fontSize: 16,
                padding: '15px 0',
                borderRadius: 14,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              J'ai mémorisé — Prêt !
            </button>
          </div>
        </div>
      </GameLayout>
    );
  }

  // ─── FIN DE PARTIE ────────────────────────────────────────────────────────
  if (phase === 'end' && endResult) {
    const isWinner =
      (endResult.winner === 'legit' && mySecret?.word) ||
      (endResult.winner === 'impostor' && !mySecret?.word);

    return (
      <GameLayout>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>{isWinner ? '🏆' : '💀'}</div>
            <p style={{ color: isWinner ? '#4ade80' : '#f87171', fontSize: 40, fontWeight: 900, marginBottom: 4 }}>
              {isWinner ? 'Victoire !' : 'Défaite'}
            </p>
            <p style={{ color: '#9ca3af', marginBottom: 4 }}>
              Les <strong style={{ color: '#fff' }}>
                {endResult.winner === 'legit' ? 'Légits' : 'Imposteurs'}
              </strong> ont gagné
            </p>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
              Le mot était : <strong style={{ color: '#a78bfa' }}>{endResult.word}</strong>
            </p>

            <div style={{ background: 'rgba(42,20,51,0.8)', borderRadius: 16, padding: 16, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                {endResult.players.map((p) => (
                  <div key={p.pseudo} style={{ textAlign: 'center', opacity: p.eliminated ? 0.4 : 1 }}>
                    <Avatar characterIndex={p.characterIndex} pseudo={p.pseudo} size={44} />
                    <p style={{ color: '#fff', fontSize: 11, fontWeight: 700, marginTop: 4 }}>{p.pseudo}</p>
                    <p style={{
                      fontSize: 10,
                      color: p.role === 'impostor' ? '#fca5a5' : '#c4b5fd',
                    }}>
                      {p.role === 'impostor' ? 'Imposteur' : 'Légit'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => navigate('/')}
              style={{
                width: '100%',
                background: '#7c3aed',
                color: '#fff',
                fontWeight: 800,
                fontSize: 16,
                padding: '14px 0',
                borderRadius: 14,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </GameLayout>
    );
  }

  // ─── RÉSULTAT ÉLIMINATION ─────────────────────────────────────────────────
  if (phase === 'eliminated' && eliminatedInfo) {
    return (
      <GameLayout>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#9ca3af', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20 }}>
              Éliminé
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <Avatar
                characterIndex={characterMap[eliminatedInfo.pseudo] ?? 0}
                pseudo={eliminatedInfo.pseudo}
                size={88}
              />
            </div>
            <p style={{ color: '#fff', fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
              {eliminatedInfo.pseudo}
            </p>
            <span style={{
              display: 'inline-block',
              padding: '6px 18px',
              borderRadius: 99,
              fontSize: 14,
              fontWeight: 700,
              background: eliminatedInfo.role === 'impostor' ? 'rgba(185,28,28,0.3)' : 'rgba(109,40,217,0.3)',
              color: eliminatedInfo.role === 'impostor' ? '#fca5a5' : '#c4b5fd',
              marginBottom: 24,
            }}>
              {eliminatedInfo.role === 'impostor' ? '🔴 Imposteur' : '🟣 Légit'}
            </span>
            <p style={{ color: '#6b7280', fontSize: 14 }}>
              {eliminatedInfo.role === 'impostor'
                ? 'La partie se termine...'
                : 'Le jeu continue avec le même mot...'}
            </p>
          </div>
        </div>
      </GameLayout>
    );
  }

  // ─── TOUS LES JOUEURS ONT JOUÉ ────────────────────────────────────────────
  if (phase === 'all_played') {
    return (
      <GameLayout>
        <TurnHeader currentPlayer={null} isMyTurn={false} timeLeft={0} round={round} phase="all_played" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <PlayersRow
            players={allPlayers}
            eliminated={eliminated}
            currentPlayer={null}
            myPseudo={user?.pseudo}
            clues={clues}
            voteMode={false}
            votes={[]}
            myVote={null}
            onVote={null}
            characterMap={characterMap}
          />
        </div>
        <div style={{ textAlign: 'center', padding: '12px 16px 24px', color: '#a78bfa', fontWeight: 700, fontSize: 16 }}>
          Tout le monde a joué — vote dans quelques secondes...
        </div>
        <CarouselNavigation total={totalTurns} current={turnIndex} />
      </GameLayout>
    );
  }

  // ─── ÉGALITÉ ──────────────────────────────────────────────────────────────
  if (phase === 'tie') {
    return (
      <GameLayout>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🤝</div>
            <p style={{ color: '#fff', fontSize: 26, fontWeight: 900, marginBottom: 8 }}>Égalité !</p>
            <p style={{ color: '#9ca3af', fontSize: 14 }}>On refait un tour...</p>
          </div>
        </div>
      </GameLayout>
    );
  }

  // ─── JEU PRINCIPAL (playing + voting) ────────────────────────────────────
  const voteMode = phase === 'voting';

  return (
    <GameLayout>
      {/* Header */}
      <TurnHeader
        currentPlayer={currentPlayer}
        isMyTurn={isMyTurn}
        timeLeft={timeLeft}
        round={round}
        phase={phase}
      />

      {/* Rangée des joueurs */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <PlayersRow
          players={allPlayers}
          eliminated={eliminated}
          currentPlayer={currentPlayer}
          myPseudo={user?.pseudo}
          clues={clues}
          voteMode={voteMode}
          votes={votes}
          myVote={myVote}
          onVote={handleVote}
          characterMap={characterMap}
        />
      </div>

      {/* Zone basse */}
      <div style={{ padding: '0 16px 12px' }}>
        {/* Rappel secret */}
        {mySecret && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(42,20,51,0.8)',
            border: mySecret.word ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12,
            padding: '10px 16px',
            marginBottom: 10,
          }}>
            <div>
              <p style={{ color: '#6b7280', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
                {mySecret.word ? 'Mon mot secret' : 'Mon indice'}
              </p>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>
                {mySecret.word ?? mySecret.theme}
              </p>
            </div>
            <Avatar characterIndex={myCharacterIndex} pseudo={user?.pseudo} size={36} />
          </div>
        )}

        {/* Input mot — seulement si c'est mon tour */}
        {isMyTurn && (
          <form onSubmit={handleSubmitClue} style={{ display: 'flex', gap: 10 }}>
            <input
              ref={inputRef}
              type="text"
              value={clueInput}
              onChange={e => setClueInput(e.target.value)}
              placeholder="Écris ton mot..."
              maxLength={50}
              autoComplete="off"
              style={{
                flex: 1,
                background: 'rgba(42,20,51,0.9)',
                border: '2px solid #7c3aed',
                borderRadius: 14,
                padding: '14px 18px',
                color: '#fff',
                fontSize: 18,
                fontWeight: 600,
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!clueInput.trim()}
              style={{
                background: clueInput.trim() ? '#7c3aed' : 'rgba(124,58,237,0.25)',
                color: '#fff',
                fontWeight: 900,
                fontSize: 22,
                padding: '0 20px',
                borderRadius: 14,
                border: 'none',
                cursor: clueInput.trim() ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s',
              }}
            >✓</button>
          </form>
        )}

        {/* Attente tour */}
        {!isMyTurn && phase === 'playing' && (
          <div style={{
            background: 'rgba(42,20,51,0.5)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 12,
            padding: '12px 16px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: 14,
          }}>
            En attente de <strong style={{ color: '#a78bfa' }}>{currentPlayer}</strong>...
          </div>
        )}

        {/* Message vote */}
        {voteMode && !myVote && (
          <div style={{
            background: 'rgba(42,20,51,0.5)',
            border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: 12,
            padding: '12px 16px',
            textAlign: 'center',
            color: '#a78bfa',
            fontSize: 14,
            fontWeight: 600,
          }}>
            Clique sur "Voter" sous un joueur pour voter
          </div>
        )}
        {voteMode && myVote && (
          <div style={{
            background: 'rgba(42,20,51,0.5)',
            borderRadius: 12,
            padding: '12px 16px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: 13,
          }}>
            Tu as voté contre <strong style={{ color: '#fff' }}>{myVote}</strong>. En attente des autres...
          </div>
        )}
      </div>

      {/* Navigation dots */}
      <CarouselNavigation total={totalTurns} current={turnIndex} />
    </GameLayout>
  );
}
