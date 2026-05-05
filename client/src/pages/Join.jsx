import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import CharacterPicker from '../components/CharacterPicker';
import Avatar from '../components/game/Avatar';

export default function Join() {
  const { code } = useParams();
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [takenIndexes, setTakenIndexes] = useState([]);
  const [characterIndex, setCharacterIndex] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auth fields (si pas connecté)
  const [authTab, setAuthTab] = useState('guest'); // 'guest' | 'account'
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const token = user?.token || '';
        const res = await apiFetch(`/api/rooms/${code}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) { setError('Partie introuvable ou déjà commencée.'); return; }
        const data = await res.json();
        setRoom(data.room);
        const taken = (data.players || []).map(p => p.character_index).filter(i => i != null);
        setTakenIndexes(taken);
      } catch {
        setError('Impossible de contacter le serveur.');
      }
    };
    fetchRoom();
  }, [code, user]);

  const handleJoin = async () => {
    if (characterIndex === null) { setError('Choisis un personnage.'); return; }
    setError('');
    setLoading(true);

    try {
      let currentUser = user;

      // Si pas connecté → auth d'abord
      if (!currentUser) {
        let endpoint = authTab === 'guest' ? '/api/auth/guest' : (isRegister ? '/api/auth/register' : '/api/auth/login');
        let body = authTab === 'guest' ? { pseudo } : { pseudo, password };

        const res = await apiFetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Erreur'); setLoading(false); return; }
        login(data);
        currentUser = data;
      }

      // Stocker le characterIndex pour le lobby
      localStorage.setItem('pendingCharacterIndex', characterIndex);
      navigate(`/lobby/${code}`);
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  };

  if (error && !room) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg,#3b1d46,#2a1433)' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#f87171', fontSize: 18, marginBottom: 16 }}>{error}</p>
          <button onClick={() => navigate('/')} style={{ color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#3b1d46,#2a1433)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'rgba(42,20,51,0.9)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#9ca3af', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
            Rejoindre la partie
          </p>
          <p style={{ color: '#8b5cf6', fontFamily: 'monospace', fontSize: 28, fontWeight: 900, letterSpacing: 6 }}>
            {code}
          </p>
          {room && (
            <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
              {room.max_players} joueurs max · {room.num_impostors} imposteur{room.num_impostors > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Auth si pas connecté */}
        {!user && (
          <div>
            <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(139,92,246,0.3)', marginBottom: 14 }}>
              {['guest', 'account'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setAuthTab(tab)}
                  style={{
                    flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: authTab === tab ? '#7c3aed' : 'transparent',
                    color: authTab === tab ? '#fff' : '#9ca3af',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab === 'guest' ? 'Invité' : 'Compte'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                type="text"
                value={pseudo}
                onChange={e => setPseudo(e.target.value)}
                placeholder="Ton pseudo..."
                maxLength={30}
                style={{ background: 'rgba(42,20,51,0.8)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 15, outline: 'none' }}
              />
              {authTab === 'account' && (
                <>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mot de passe..."
                    style={{ background: 'rgba(42,20,51,0.8)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 15, outline: 'none' }}
                  />
                  <button
                    onClick={() => setIsRegister(!isRegister)}
                    style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, textAlign: 'left' }}
                  >
                    {isRegister ? 'Déjà un compte ? Se connecter' : "Pas de compte ? S'inscrire"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Si connecté → afficher l'identité */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12, padding: '10px 14px' }}>
            {characterIndex !== null && <Avatar characterIndex={characterIndex} size={36} pseudo={user.pseudo} />}
            <div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{user.pseudo}</p>
              <p style={{ color: '#9ca3af', fontSize: 12 }}>{user.isGuest ? 'Invité' : 'Compte'}</p>
            </div>
          </div>
        )}

        {/* Choix personnage */}
        <CharacterPicker
          selected={characterIndex}
          takenIndexes={takenIndexes}
          onChange={setCharacterIndex}
        />

        {error && <p style={{ color: '#f87171', fontSize: 13, textAlign: 'center' }}>{error}</p>}

        <button
          onClick={handleJoin}
          disabled={loading || characterIndex === null || (!user && !pseudo.trim())}
          style={{
            background: loading || characterIndex === null || (!user && !pseudo.trim()) ? 'rgba(124,58,237,0.3)' : '#7c3aed',
            color: '#fff', fontWeight: 800, fontSize: 16,
            padding: '14px 0', borderRadius: 14, border: 'none',
            cursor: loading || characterIndex === null ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {loading ? 'Connexion...' : 'Rejoindre la partie'}
        </button>

        <button
          onClick={() => navigate('/')}
          style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
