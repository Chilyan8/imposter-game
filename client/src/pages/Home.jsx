import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [numImpostors, setNumImpostors] = useState(1);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const handleCreate = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ maxPlayers, numImpostors }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      navigate(`/lobby/${data.room.code}`);
    } catch {
      setError('Impossible de contacter le serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      setError('Code invalide');
      return;
    }
    navigate(`/lobby/${code}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4" style={{ background: 'linear-gradient(160deg, #3b1d46 0%, #2a1433 100%)' }}>
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-2">Imposter</h1>
        <p className="text-gray-400 text-lg">Le jeu de déduction en temps réel</p>
      </div>

      <p className="text-gray-300 text-sm">
        Connecté en tant que{' '}
        <span className="text-violet-400 font-semibold">{user?.pseudo}</span>
        {user?.isGuest && <span className="text-gray-500 ml-1">(invité)</span>}
      </p>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={() => { setShowCreate(true); setShowJoin(false); setError(''); }}
          className="bg-violet-700 hover:bg-violet-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Créer une partie
        </button>
        <button
          onClick={() => { setShowJoin(true); setShowCreate(false); setError(''); }}
          className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors border border-gray-600"
        >
          Rejoindre une partie
        </button>
      </div>

      {/* Modal Créer */}
      {showCreate && (
        <div className="w-full max-w-xs bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col gap-4">
          <h2 className="text-white font-semibold text-lg">Créer une partie</h2>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">
              Nombre de joueurs : <span className="text-white">{maxPlayers}</span>
            </label>
            <input
              type="range" min="3" max="10"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full accent-violet-600"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">
              Nombre d'imposteurs : <span className="text-white">{numImpostors}</span>
            </label>
            <input
              type="range" min="1" max={Math.max(1, maxPlayers - 2)}
              value={numImpostors}
              onChange={(e) => setNumImpostors(Number(e.target.value))}
              className="w-full accent-violet-600"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={loading}
            className="bg-violet-700 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            {loading ? 'Création...' : 'Créer'}
          </button>
        </div>
      )}

      {/* Modal Rejoindre */}
      {showJoin && (
        <div className="w-full max-w-xs bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col gap-4">
          <h2 className="text-white font-semibold text-lg">Rejoindre une partie</h2>

          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Code de la partie..."
            maxLength={8}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 font-mono tracking-widest uppercase"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleJoin}
            className="bg-violet-700 hover:bg-violet-500 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            Rejoindre
          </button>
        </div>
      )}

      <button
        onClick={handleLogout}
        className="text-gray-600 hover:text-gray-400 text-sm transition-colors"
      >
        Se déconnecter
      </button>
    </div>
  );
}
