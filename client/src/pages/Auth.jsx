import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

export default function Auth() {
  const [tab, setTab] = useState('guest');
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let endpoint = '';
      let body = {};

      if (tab === 'guest') {
        endpoint = '/api/auth/guest';
        body = { pseudo };
      } else if (isRegister) {
        endpoint = '/api/auth/register';
        body = { pseudo, password };
      } else {
        endpoint = '/api/auth/login';
        body = { pseudo, password };
      }

      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur inconnue');
        return;
      }

      login(data);
      navigate('/');
    } catch {
      setError('Impossible de contacter le serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-gray-900 rounded-xl p-8 border border-gray-800">
        <h1 className="text-3xl font-bold text-white text-center mb-6">Imposter</h1>

        {/* Onglets */}
        <div className="flex rounded-lg overflow-hidden border border-gray-700 mb-6">
          <button
            onClick={() => setTab('guest')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === 'guest'
                ? 'bg-violet-700 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Invité
          </button>
          <button
            onClick={() => setTab('account')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === 'account'
                ? 'bg-violet-700 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Compte
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Pseudo</label>
            <input
              type="text"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="Ton pseudo..."
              maxLength={30}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {tab === 'account' && (
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ton mot de passe..."
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
              />
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-violet-700 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading
              ? 'Chargement...'
              : tab === 'guest'
              ? 'Jouer en invité'
              : isRegister
              ? "Créer le compte"
              : 'Se connecter'}
          </button>

          {tab === 'account' && (
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              {isRegister
                ? 'Déjà un compte ? Se connecter'
                : 'Pas de compte ? S\'inscrire'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
