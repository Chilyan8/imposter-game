import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';

export default function Game() {
  const { code } = useParams();
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  // Rôle du joueur local
  const [myRole, setMyRole] = useState(null);
  const [myWord, setMyWord] = useState(null);
  const [myTheme, setMyTheme] = useState(null);
  const [roleRevealed, setRoleRevealed] = useState(false);
  const [roleConfirmed, setRoleConfirmed] = useState(false);

  // État de la partie
  const [phase, setPhase] = useState('waiting');
  const [round, setRound] = useState(1);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [totalTurns, setTotalTurns] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [clues, setClues] = useState([]);
  const [clueInput, setClueInput] = useState('');

  // Vote
  const [votePlayers, setVotePlayers] = useState([]);
  const [myVote, setMyVote] = useState(null);
  const [voteCount, setVoteCount] = useState({});
  const [votesGiven, setVotesGiven] = useState(0);
  const [totalVoters, setTotalVoters] = useState(0);

  // Résultats
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
    });

    socket.on('game:state', ({ phase, clues, round, currentPlayer, turnIndex, totalTurns }) => {
      setClues(clues || []);
      setRound(round);
      setCurrentPlayer(currentPlayer);
      setTurnIndex(turnIndex);
      setTotalTurns(totalTurns);
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

    socket.on('game:timer', ({ timeLeft }) => {
      setTimeLeft(timeLeft);
    });

    socket.on('game:vote_start', ({ players, clues }) => {
      setPhase('voting');
      setVotePlayers(players);
      setClues(clues || []);
      setTotalVoters(players.length);
      setVotesGiven(0);
      setVoteCount({});
      setMyVote(null);
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

  // ─── ÉCRAN : Révélation du rôle ───────────────────────────────────────────
  if (!roleConfirmed && myRole) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#0f0f14]">
        <div className="w-full max-w-sm text-center">
          <p className="text-gray-500 text-sm mb-6">Round {round}</p>

          {!roleRevealed ? (
            <>
              <div className="w-24 h-24 rounded-full bg-gray-800 border-2 border-gray-700 mx-auto mb-8 flex items-center justify-center text-4xl">
                🎭
              </div>
              <h2 className="text-white text-xl font-semibold mb-2">Ton rôle est prêt</h2>
              <p className="text-gray-400 text-sm mb-8">Assure-toi que personne ne regarde ton écran</p>
              <button
                onClick={() => setRoleRevealed(true)}
                className="w-full bg-violet-700 hover:bg-violet-500 text-white font-semibold py-4 rounded-xl transition-colors"
              >
                Voir mon rôle
              </button>
            </>
          ) : (
            <>
              {myRole === 'legit' ? (
                <div className="bg-violet-950 border border-violet-700 rounded-2xl p-8 mb-8">
                  <div className="text-violet-400 text-sm font-medium mb-3 uppercase tracking-widest">Légit</div>
                  <div className="text-white text-4xl font-bold mb-2">{myWord}</div>
                  <p className="text-violet-300 text-sm">C'est ton mot secret. Aide les autres à trouver l'imposteur sans le révéler.</p>
                </div>
              ) : (
                <div className="bg-red-950 border border-red-700 rounded-2xl p-8 mb-8">
                  <div className="text-red-400 text-sm font-medium mb-3 uppercase tracking-widest">Imposteur</div>
                  <div className="text-white text-2xl font-bold mb-1">Thème : {myTheme}</div>
                  <p className="text-red-300 text-sm mt-3">Tu n'as PAS le mot exact. Blends-toi sans te faire repérer.</p>
                </div>
              )}
              <button
                onClick={() => setRoleConfirmed(true)}
                className="w-full bg-violet-700 hover:bg-violet-500 text-white font-semibold py-4 rounded-xl transition-colors"
              >
                J'ai mémorisé, c'est parti !
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── ÉCRAN : Fin de partie ────────────────────────────────────────────────
  if (phase === 'end' && endResult) {
    const isWinner =
      (endResult.winner === 'legit' && myRole === 'legit') ||
      (endResult.winner === 'impostor' && myRole === 'impostor');

    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#0f0f14]">
        <div className="w-full max-w-sm text-center">
          <div className={`text-6xl font-bold mb-3 ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
            {isWinner ? 'Victoire !' : 'Défaite'}
          </div>
          <p className="text-gray-400 mb-1">
            Les <span className="text-white font-bold">
              {endResult.winner === 'legit' ? 'Légits' : 'Imposteurs'}
            </span> ont gagné
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Le mot était : <span className="text-violet-400 font-bold">{endResult.word}</span>
          </p>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-8 text-left">
            <p className="text-gray-500 text-xs mb-3 uppercase tracking-wider">Joueurs</p>
            {endResult.players.map((p) => (
              <div key={p.id} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                <span className="text-white">{p.pseudo}</span>
                <span className={`text-xs font-medium px-2 py-1 rounded ${
                  p.role === 'impostor'
                    ? 'bg-red-900 text-red-300'
                    : 'bg-violet-900 text-violet-300'
                }`}>
                  {p.role === 'impostor' ? 'Imposteur' : 'Légit'}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full bg-violet-700 hover:bg-violet-500 text-white font-semibold py-4 rounded-xl transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // ─── ÉCRAN : Résultat d'élimination ──────────────────────────────────────
  if (phase === 'result' && eliminatedInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#0f0f14]">
        <div className="w-full max-w-sm text-center">
          <p className="text-gray-500 text-sm mb-6">Résultat du vote</p>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-6">
            <p className="text-gray-400 text-sm mb-2">Éliminé</p>
            <p className="text-white text-3xl font-bold mb-3">{eliminatedInfo.pseudo}</p>
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${
              eliminatedInfo.role === 'impostor'
                ? 'bg-red-900 text-red-300'
                : 'bg-violet-900 text-violet-300'
            }`}>
              {eliminatedInfo.role === 'impostor' ? '🔴 Imposteur' : '🟣 Légit'}
            </span>
          </div>
          <p className="text-gray-500 text-sm animate-pulse">Nouveau round dans quelques secondes...</p>
        </div>
      </div>
    );
  }

  // ─── ÉCRAN : Vote ─────────────────────────────────────────────────────────
  if (phase === 'voting') {
    return (
      <div className="min-h-screen flex flex-col px-4 py-8 bg-[#0f0f14] max-w-lg mx-auto">
        <div className="text-center mb-6">
          <p className="text-gray-500 text-xs mb-1">Round {round}</p>
          <h2 className="text-white text-2xl font-bold">Qui est l'imposteur ?</h2>
          <p className="text-gray-400 text-sm mt-1">
            {votesGiven} / {totalVoters} votes
          </p>
        </div>

        {/* Récap des mots */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Mots donnés ce round</p>
          {clues.map((c, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
              <span className="text-gray-400 text-sm">{c.pseudo}</span>
              <span className="text-white font-semibold">{c.word}</span>
            </div>
          ))}
        </div>

        {/* Boutons de vote */}
        <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">
          {myVote ? 'Tu as voté' : 'Choisis un joueur à éliminer'}
        </p>
        <div className="flex flex-col gap-2 mb-4">
          {votePlayers
            .filter((p) => p !== user?.pseudo)
            .map((p) => (
              <button
                key={p}
                onClick={() => handleVote(p)}
                disabled={!!myVote}
                className={`py-4 px-5 rounded-xl font-medium transition-colors flex justify-between items-center ${
                  myVote === p
                    ? 'bg-violet-700 text-white border border-violet-500'
                    : myVote
                    ? 'bg-gray-900 text-gray-600 border border-gray-800 cursor-not-allowed'
                    : 'bg-gray-900 hover:bg-gray-800 text-white border border-gray-700'
                }`}
              >
                <span>{p}</span>
                {voteCount[p] ? (
                  <span className="text-xs bg-violet-900 text-violet-300 px-2 py-1 rounded">
                    {voteCount[p]} vote{voteCount[p] > 1 ? 's' : ''}
                  </span>
                ) : null}
              </button>
            ))}
        </div>

        {!myVote && (
          <p className="text-gray-600 text-xs text-center">
            Tu ne peux pas voter contre toi-même
          </p>
        )}
      </div>
    );
  }

  // ─── ÉCRAN : Jeu principal ────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col px-4 py-6 bg-[#0f0f14] max-w-lg mx-auto">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <span className="text-gray-600 text-sm">Round {round}</span>
        <span className="text-gray-600 text-sm">Tour {turnIndex + 1} / {totalTurns}</span>
      </div>

      {/* Mon rôle */}
      <div className={`rounded-xl p-4 mb-6 border ${
        myRole === 'impostor'
          ? 'bg-red-950 border-red-800'
          : 'bg-violet-950 border-violet-800'
      }`}>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs uppercase tracking-wider mb-1 text-gray-400">Mon rôle</p>
            {myRole === 'legit' ? (
              <p className="text-white font-bold text-lg">{myWord}</p>
            ) : (
              <p className="text-white font-bold text-lg">Thème : {myTheme}</p>
            )}
          </div>
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${
            myRole === 'impostor'
              ? 'bg-red-900 text-red-300'
              : 'bg-violet-900 text-violet-300'
          }`}>
            {myRole === 'impostor' ? 'Imposteur' : 'Légit'}
          </span>
        </div>
      </div>

      {/* Joueur actuel + timer */}
      <div className="text-center mb-6">
        {isMyTurn ? (
          <div className="bg-violet-900 border border-violet-700 rounded-xl p-4 mb-3">
            <p className="text-violet-200 font-bold text-lg">🎯 C'est ton tour !</p>
            <p className="text-violet-300 text-sm">Donne un mot en rapport avec le thème</p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-3">
            <p className="text-gray-400 text-sm mb-1">Tour de</p>
            <p className="text-white font-bold text-xl">{currentPlayer}</p>
          </div>
        )}

        <div className={`text-6xl font-mono font-bold ${
          timeLeft <= 5 ? 'text-red-400' : timeLeft <= 10 ? 'text-orange-400' : 'text-white'
        }`}>
          {timeLeft}
        </div>
        <p className="text-gray-600 text-xs mt-1">secondes</p>
      </div>

      {/* Input */}
      {isMyTurn && (
        <form onSubmit={handleSubmitClue} className="flex gap-2 mb-6">
          <input
            ref={inputRef}
            type="text"
            value={clueInput}
            onChange={(e) => setClueInput(e.target.value)}
            placeholder="Tape ton mot..."
            maxLength={50}
            autoComplete="off"
            className="flex-1 bg-gray-900 border border-violet-600 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-400 text-lg"
          />
          <button
            type="submit"
            disabled={!clueInput.trim()}
            className="bg-violet-700 hover:bg-violet-500 disabled:opacity-40 text-white font-bold px-6 rounded-xl transition-colors"
          >
            ✓
          </button>
        </form>
      )}

      {/* Liste des mots */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex-1">
        <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">
          Mots donnés ({clues.length}/{totalTurns})
        </p>
        {clues.length === 0 ? (
          <p className="text-gray-700 text-sm text-center py-4">Aucun mot encore...</p>
        ) : (
          <div className="flex flex-col gap-2">
            {clues.map((c, i) => (
              <div
                key={i}
                className={`flex justify-between items-center py-2 px-3 rounded-lg ${
                  c.pseudo === user?.pseudo ? 'bg-gray-800' : ''
                }`}
              >
                <span className={`text-sm ${c.pseudo === user?.pseudo ? 'text-violet-400' : 'text-gray-400'}`}>
                  {c.pseudo}
                </span>
                <span className="text-white font-semibold">{c.word}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
