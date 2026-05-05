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

  const [myRole, setMyRole] = useState(null);
  const [myWord, setMyWord] = useState(null);
  const [myTheme, setMyTheme] = useState(null);
  const [roleRevealed, setRoleRevealed] = useState(false);
  const [roleConfirmed, setRoleConfirmed] = useState(false);

  const [phase, setPhase] = useState('waiting');
  const [round, setRound] = useState(1);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [totalTurns, setTotalTurns] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [clues, setClues] = useState([]);
  const [clueInput, setClueInput] = useState('');
  const [allPlayers, setAllPlayers] = useState([]);
  const [eliminated, setEliminated] = useState([]);

  const [votePlayers, setVotePlayers] = useState([]);
  const [myVote, setMyVote] = useState(null);
  const [voteCount, setVoteCount] = useState({});
  const [votesGiven, setVotesGiven] = useState(0);
  const [totalVoters, setTotalVoters] = useState(0);

  const [eliminatedInfo, setEliminatedInfo] = useState(null);
  const [endResult, setEndResult] = useState(null);

  const inputRef = useRef(null);
  const isMyTurn = currentPlayer === user?.pseudo && phase === 'playing';

  useEffect(() => {
    socket.emit('game:join', { code, pseudo: user?.pseudo });
    socket.emit('game:init', { code });

    socket.on('game:role', ({ role, word, theme, round }) => {
      setMyRole(role);
      setMyWord(word);
      setMyTheme(theme);
      setRound(round);
      setRoleRevealed(false);
      setRoleConfirmed(false);
      setEliminatedInfo(null);
      setMyVote(null);
      setVoteCount({});
      setClues([]);
    });

    socket.on('game:state', ({ phase, clues, round, currentPlayer, turnIndex, totalTurns, eliminated }) => {
      setClues(clues || []);
      setRound(round);
      setCurrentPlayer(currentPlayer);
      setTurnIndex(turnIndex);
      setTotalTurns(totalTurns);
      setEliminated(eliminated || []);
      if (phase === 'playing' || phase === 'voting') setPhase(phase);
    });

    socket.on('game:turn_start', ({ currentPlayer, timeLeft }) => {
      setCurrentPlayer(currentPlayer);
      setTimeLeft(timeLeft);
      setClueInput('');
      if (currentPlayer === user?.pseudo) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    });

    socket.on('game:timer', ({ timeLeft }) => setTimeLeft(timeLeft));

    socket.on('game:vote_start', ({ players, clues }) => {
      setPhase('voting');
      setVotePlayers(players);
      setClues(clues || []);
      setTotalVoters(players.length);
      setVotesGiven(0);
      setVoteCount({});
      setMyVote(null);
      setAllPlayers(players);
    });

    socket.on('game:vote_update', ({ votes, total, voteCount }) => {
      setVotesGiven(votes);
      setTotalVoters(total);
      setVoteCount(voteCount || {});
    });

    socket.on('game:eliminated', ({ pseudo, role, voteCount }) => {
      setEliminatedInfo({ pseudo, role, voteCount });
      setPhase('result');
    });

    socket.on('game:end', ({ winner, word, players }) => {
      setEndResult({ winner, word, players });
      setPhase('end');
    });

    return () => {
      socket.off('game:role');
      socket.off('game:state');
      socket.off('game:turn_start');
      socket.off('game:timer');
      socket.off('game:vote_start');
      socket.off('game:vote_update');
      socket.off('game:eliminated');
      socket.off('game:end');
    };
  }, [code, socket, user?.pseudo]);

  // Synchroniser allPlayers depuis turnOrder
  useEffect(() => {
    if (totalTurns > 0 && allPlayers.length === 0) {
      // sera mis à jour par game:vote_start
    }
  }, [totalTurns, allPlayers]);

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

  // ─── RÔLE ────────────────────────────────────────────────────────────────
  if (!roleConfirmed && myRole) {
    return (
      <GameLayout>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-xs text-center">
            <p style={{ color: '#a78bfa', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 24 }}>
              Round {round}
            </p>

            {!roleRevealed ? (
              <>
                <div className="flex justify-center mb-6">
                  <Avatar pseudo={user?.pseudo} size={88} />
                </div>
                <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
                  Ton rôle est prêt
                </h2>
                <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 32 }}>
                  Assure-toi que personne ne regarde ton écran
                </p>
                <button
                  onClick={() => setRoleRevealed(true)}
                  style={{
                    width: '100%',
                    background: '#7c3aed',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 16,
                    padding: '14px 0',
                    borderRadius: 14,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Voir mon rôle
                </button>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-5">
                  <Avatar pseudo={user?.pseudo} size={80} />
                </div>
                <div
                  style={{
                    background: myRole === 'impostor' ? 'rgba(185,28,28,0.2)' : 'rgba(109,40,217,0.2)',
                    border: myRole === 'impostor' ? '2px solid #b91c1c' : '2px solid #7c3aed',
                    borderRadius: 20,
                    padding: '28px 24px',
                    marginBottom: 28,
                  }}
                >
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 3,
                    textTransform: 'uppercase',
                    color: myRole === 'impostor' ? '#fca5a5' : '#c4b5fd',
                    marginBottom: 12,
                  }}>
                    {myRole === 'impostor' ? 'Imposteur' : 'Légit'}
                  </div>
                  {myRole === 'legit' ? (
                    <>
                      <div style={{ color: '#fff', fontSize: 36, fontWeight: 900, marginBottom: 8 }}>{myWord}</div>
                      <p style={{ color: '#c4b5fd', fontSize: 13 }}>C'est ton mot secret. Aide les légits sans le révéler.</p>
                    </>
                  ) : (
                    <>
                      <div style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Thème : {myTheme}</div>
                      <p style={{ color: '#fca5a5', fontSize: 13 }}>Tu n'as PAS le mot exact. Blends-toi !</p>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setRoleConfirmed(true)}
                  style={{
                    width: '100%',
                    background: '#7c3aed',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 16,
                    padding: '14px 0',
                    borderRadius: 14,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  J'ai mémorisé — Go !
                </button>
              </>
            )}
          </div>
        </div>
      </GameLayout>
    );
  }

  // ─── FIN DE PARTIE ────────────────────────────────────────────────────────
  if (phase === 'end' && endResult) {
    const isWinner =
      (endResult.winner === 'legit' && myRole === 'legit') ||
      (endResult.winner === 'impostor' && myRole === 'impostor');

    return (
      <GameLayout>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-sm text-center">
            <div style={{ fontSize: 64, marginBottom: 8 }}>{isWinner ? '🏆' : '💀'}</div>
            <div style={{ color: isWinner ? '#4ade80' : '#f87171', fontSize: 42, fontWeight: 900, marginBottom: 4 }}>
              {isWinner ? 'Victoire !' : 'Défaite'}
            </div>
            <p style={{ color: '#d1d5db', marginBottom: 4 }}>
              Les <strong style={{ color: '#fff' }}>
                {endResult.winner === 'legit' ? 'Légits' : 'Imposteurs'}
              </strong> ont gagné
            </p>
            <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 28 }}>
              Le mot était : <strong style={{ color: '#a78bfa' }}>{endResult.word}</strong>
            </p>

            <div style={{ background: 'rgba(42,20,51,0.8)', borderRadius: 16, padding: 16, marginBottom: 28 }}>
              {endResult.players.map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar pseudo={p.pseudo} size={32} />
                    <span style={{ color: '#fff', fontWeight: 600 }}>{p.pseudo}</span>
                  </div>
                  <span style={{
                    fontSize: 12,
                    padding: '3px 10px',
                    borderRadius: 99,
                    background: p.role === 'impostor' ? 'rgba(185,28,28,0.3)' : 'rgba(109,40,217,0.3)',
                    color: p.role === 'impostor' ? '#fca5a5' : '#c4b5fd',
                    fontWeight: 600,
                  }}>
                    {p.role === 'impostor' ? 'Imposteur' : 'Légit'}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/')}
              style={{
                width: '100%',
                background: '#7c3aed',
                color: '#fff',
                fontWeight: 700,
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
  if (phase === 'result' && eliminatedInfo) {
    return (
      <GameLayout>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 20, letterSpacing: 2, textTransform: 'uppercase' }}>
              Résultat du vote
            </p>
            <div className="flex justify-center mb-4">
              <Avatar pseudo={eliminatedInfo.pseudo} size={88} />
            </div>
            <p style={{ color: '#fff', fontSize: 28, fontWeight: 900, marginBottom: 10 }}>
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
            <p style={{ color: '#6b7280', fontSize: 14 }} className="animate-pulse">
              Nouveau round dans quelques secondes...
            </p>
          </div>
        </div>
      </GameLayout>
    );
  }

  // ─── VOTE ─────────────────────────────────────────────────────────────────
  if (phase === 'voting') {
    return (
      <GameLayout>
        <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6">
          <div className="text-center mb-5">
            <p style={{ color: '#a78bfa', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
              Round {round}
            </p>
            <h2 style={{ color: '#fff', fontSize: 26, fontWeight: 900, marginBottom: 4 }}>
              Qui est l'imposteur ?
            </h2>
            <p style={{ color: '#9ca3af', fontSize: 13 }}>
              {votesGiven} / {totalVoters} votes
            </p>
          </div>

          {/* Avatars joueurs */}
          <div className="flex justify-center gap-3 mb-5 flex-wrap">
            {votePlayers.map((p) => (
              <div key={p} style={{ textAlign: 'center', opacity: myVote === p ? 1 : 0.7 }}>
                <Avatar pseudo={p} size={44} />
              </div>
            ))}
          </div>

          {/* Récap mots */}
          <div style={{ background: 'rgba(42,20,51,0.7)', borderRadius: 14, padding: 14, marginBottom: 16, border: '1px solid rgba(139,92,246,0.15)' }}>
            <p style={{ color: '#6b7280', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
              Mots donnés
            </p>
            {clues.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: '#9ca3af', fontSize: 14 }}>{c.pseudo}</span>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{c.word}</span>
              </div>
            ))}
          </div>

          {/* Boutons vote */}
          <div className="flex flex-col gap-2">
            {votePlayers
              .filter((p) => p !== user?.pseudo)
              .map((p) => (
                <button
                  key={p}
                  onClick={() => handleVote(p)}
                  disabled={!!myVote}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 18px',
                    borderRadius: 14,
                    border: myVote === p ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.08)',
                    background: myVote === p ? 'rgba(139,92,246,0.25)' : 'rgba(42,20,51,0.7)',
                    color: myVote && myVote !== p ? '#4b5563' : '#fff',
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: myVote ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar pseudo={p} size={32} />
                    <span>{p}</span>
                  </div>
                  {voteCount[p] ? (
                    <span style={{ fontSize: 12, background: 'rgba(139,92,246,0.3)', color: '#c4b5fd', padding: '3px 10px', borderRadius: 99 }}>
                      {voteCount[p]} vote{voteCount[p] > 1 ? 's' : ''}
                    </span>
                  ) : null}
                </button>
              ))}
          </div>

          {!myVote && (
            <p style={{ color: '#4b5563', fontSize: 12, textAlign: 'center', marginTop: 12 }}>
              Tu ne peux pas voter pour toi-même
            </p>
          )}
        </div>
      </GameLayout>
    );
  }

  // ─── JEU PRINCIPAL ────────────────────────────────────────────────────────
  // Construire la liste des joueurs depuis le turnOrder
  const turnOrderPseudos = allPlayers.length > 0
    ? allPlayers
    : clues.map((c) => c.pseudo).concat(
        currentPlayer && !clues.find((c) => c.pseudo === currentPlayer) ? [currentPlayer] : []
      );

  return (
    <GameLayout>
      {/* Header */}
      <TurnHeader
        currentPlayer={currentPlayer}
        isMyTurn={isMyTurn}
        timeLeft={timeLeft}
        round={round}
      />

      {/* Zone joueurs */}
      <div className="flex-1 flex flex-col justify-center">
        <PlayersRow
          players={turnOrderPseudos.length > 0 ? turnOrderPseudos : (currentPlayer ? [currentPlayer] : [])}
          currentPlayer={currentPlayer}
          myPseudo={user?.pseudo}
          clues={clues}
          eliminated={eliminated}
        />
      </div>

      {/* Zone mon rôle + input */}
      <div style={{ padding: '0 16px 16px' }}>
        {/* Rappel rôle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(42,20,51,0.8)',
          border: myRole === 'impostor' ? '1px solid rgba(185,28,28,0.4)' : '1px solid rgba(139,92,246,0.25)',
          borderRadius: 12,
          padding: '10px 16px',
          marginBottom: 12,
        }}>
          <div>
            <span style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>
              {myRole === 'impostor' ? 'Imposteur' : 'Légit'}
            </span>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
              {myRole === 'legit' ? myWord : `Thème : ${myTheme}`}
            </p>
          </div>
          <span style={{ fontSize: 22 }}>{myRole === 'impostor' ? '🔴' : '🟣'}</span>
        </div>

        {/* Input si c'est mon tour */}
        {isMyTurn && (
          <form onSubmit={handleSubmitClue} style={{ display: 'flex', gap: 10 }}>
            <input
              ref={inputRef}
              type="text"
              value={clueInput}
              onChange={(e) => setClueInput(e.target.value)}
              placeholder="Tape ton mot..."
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
                background: clueInput.trim() ? '#7c3aed' : 'rgba(124,58,237,0.3)',
                color: '#fff',
                fontWeight: 800,
                fontSize: 20,
                padding: '0 22px',
                borderRadius: 14,
                border: 'none',
                cursor: clueInput.trim() ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s',
              }}
            >
              ✓
            </button>
          </form>
        )}

        {!isMyTurn && phase === 'playing' && (
          <div style={{
            background: 'rgba(42,20,51,0.5)',
            borderRadius: 12,
            padding: '12px 16px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: 14,
          }}>
            En attente de <strong style={{ color: '#a78bfa' }}>{currentPlayer}</strong>...
          </div>
        )}
      </div>

      {/* Navigation bas */}
      <CarouselNavigation total={totalTurns || 1} current={turnIndex} />
    </GameLayout>
  );
}
