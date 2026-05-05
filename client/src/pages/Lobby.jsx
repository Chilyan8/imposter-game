import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';

export default function Lobby() {
  const { code } = useParams();
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  const [players, setPlayers] = useState([]);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    socket.emit('lobby:join', { code, token: user.token });

    socket.on('lobby:joined', ({ room }) => {
      setRoom(room);
    });

    socket.on('lobby:update', ({ players, room }) => {
      setPlayers(players);
      if (room) setRoom(room);
    });

    socket.on('game:start', () => {
      navigate(`/game/${code}`);
    });

    socket.on('error', (msg) => {
      setError(msg);
    });

    return () => {
      socket.off('lobby:joined');
      socket.off('lobby:update');
      socket.off('game:start');
      socket.off('error');
    };
  }, [code, socket, user.token, navigate]);

  const handleStart = () => {
    socket.emit('lobby:start', { code, token: user.token });
  };

  const isHost = players.length > 0 && players[0]?.pseudo === user.pseudo;
  const inviteLink = `${window.location.origin}/join/${code}`;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="text-violet-400 hover:text-violet-300"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-1">Lobby</h1>
        <div className="flex items-center gap-2 justify-center">
          <span className="text-gray-400 text-sm">Code :</span>
          <span className="text-violet-400 font-mono font-bold text-xl tracking-widest">{code}</span>
        </div>
      </div>

      {/* Lien d'invitation */}
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-lg p-3 flex items-center gap-2">
        <span className="text-gray-500 text-xs flex-1 truncate">{inviteLink}</span>
        <button
          onClick={() => navigator.clipboard.writeText(inviteLink)}
          className="text-violet-400 hover:text-violet-300 text-xs whitespace-nowrap"
        >
          Copier
        </button>
      </div>

      {/* Liste des joueurs */}
      <div className="w-full max-w-md">
        <p className="text-gray-400 text-sm mb-2">
          Joueurs ({players.length}/{room?.max_players ?? '?'})
        </p>
        <div className="flex flex-col gap-2">
          {players.map((p, i) => (
            <div
              key={p.id}
              className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between"
            >
              <span className="text-white font-medium">{p.pseudo}</span>
              <div className="flex items-center gap-2">
                {p.is_guest && <span className="text-gray-500 text-xs">invité</span>}
                {i === 0 && <span className="text-violet-400 text-xs">hôte</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bouton lancer */}
      {isHost && (
        <button
          onClick={handleStart}
          disabled={players.length < 3}
          className="bg-violet-700 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-lg transition-colors"
        >
          {players.length < 3
            ? `En attente (${players.length}/3 min)`
            : 'Lancer la partie'}
        </button>
      )}

      {!isHost && (
        <p className="text-gray-500 text-sm">En attente que l'hôte lance la partie...</p>
      )}
    </div>
  );
}
