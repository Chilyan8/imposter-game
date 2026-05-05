import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import Avatar from '../components/game/Avatar';
import CharacterPicker from '../components/CharacterPicker';

export default function Lobby() {
  const { code } = useParams();
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  const [players, setPlayers] = useState([]);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);

  // Choix personnage
  const [characterIndex, setCharacterIndex] = useState(() => {
    const pending = localStorage.getItem('pendingCharacterIndex');
    if (pending !== null) return Number(pending);
    return null;
  });
  const [showPicker, setShowPicker] = useState(false);

  const isHost = players.length > 0 && players[0]?.pseudo === user?.pseudo;
  const takenIndexes = players
    .filter(p => p.pseudo !== user?.pseudo)
    .map(p => p.character_index)
    .filter(i => i != null);

  const inviteLink = `${window.location.origin}/join/${code}`;

  // Rejoindre le lobby une fois le personnage choisi
  useEffect(() => {
    if (characterIndex === null) {
      setShowPicker(true);
      return;
    }

    localStorage.removeItem('pendingCharacterIndex');
    setShowPicker(false);

    socket.emit('lobby:join', { code, token: user.token, characterIndex });

    socket.on('lobby:joined', ({ player, room }) => {
      setRoom(room);
      setJoined(true);
    });

    socket.on('lobby:update', ({ players, room }) => {
      setPlayers(players || []);
      if (room) setRoom(room);
    });

    socket.on('game:start', () => navigate(`/game/${code}`));

    socket.on('lobby:kicked', () => {
      navigate('/?kicked=1');
    });

    socket.on('error', (msg) => setError(msg));

    return () => {
      socket.off('lobby:joined');
      socket.off('lobby:update');
      socket.off('game:start');
      socket.off('lobby:kicked');
      socket.off('error');
    };
  }, [characterIndex, code, socket, user, navigate]);

  const handleStart = () => socket.emit('lobby:start', { code, token: user.token });

  const handleKick = (targetPseudo) => {
    socket.emit('lobby:kick', { code, token: user.token, targetPseudo });
  };

  const handleConfirmCharacter = () => {
    if (characterIndex === null) return;
    setShowPicker(false);
  };

  // ─── CHOIX PERSONNAGE ─────────────────────────────────────────────────────
  if (showPicker) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#3b1d46,#2a1433)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 400, background: 'rgba(42,20,51,0.9)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#9ca3af', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Lobby</p>
            <p style={{ color: '#8b5cf6', fontFamily: 'monospace', fontSize: 24, fontWeight: 900, letterSpacing: 6 }}>{code}</p>
          </div>

          <CharacterPicker
            selected={characterIndex}
            takenIndexes={takenIndexes}
            onChange={setCharacterIndex}
          />

          {error && <p style={{ color: '#f87171', fontSize: 13, textAlign: 'center' }}>{error}</p>}

          <button
            onClick={handleConfirmCharacter}
            disabled={characterIndex === null}
            style={{
              background: characterIndex !== null ? '#7c3aed' : 'rgba(124,58,237,0.3)',
              color: '#fff', fontWeight: 800, fontSize: 16,
              padding: '14px 0', borderRadius: 14, border: 'none',
              cursor: characterIndex !== null ? 'pointer' : 'not-allowed',
            }}
          >
            Confirmer le personnage
          </button>
        </div>
      </div>
    );
  }

  // ─── ERREUR ───────────────────────────────────────────────────────────────
  if (error && !joined) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#3b1d46,#2a1433)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#f87171', fontSize: 18, marginBottom: 16 }}>{error}</p>
          <button onClick={() => navigate('/')} style={{ color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // ─── LOBBY ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#3b1d46,#2a1433)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 20 }}>

      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Lobby</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <span style={{ color: '#9ca3af', fontSize: 13 }}>Code :</span>
          <span style={{ color: '#8b5cf6', fontFamily: 'monospace', fontSize: 22, fontWeight: 900, letterSpacing: 4 }}>{code}</span>
        </div>
      </div>

      {/* Lien d'invitation */}
      <div style={{ width: '100%', maxWidth: 420, background: 'rgba(42,20,51,0.7)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: '#6b7280', fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inviteLink}</span>
        <button
          onClick={() => navigator.clipboard.writeText(inviteLink)}
          style={{ color: '#a78bfa', background: 'none', border: '1px solid rgba(139,92,246,0.4)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0 }}
        >
          Copier
        </button>
      </div>

      {/* Joueurs */}
      <div style={{ width: '100%', maxWidth: 420 }}>
        <p style={{ color: '#9ca3af', fontSize: 12, marginBottom: 10 }}>
          Joueurs ({players.length}/{room?.max_players ?? '?'})
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {players.map((p, i) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'rgba(42,20,51,0.7)',
              border: p.pseudo === user?.pseudo ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.05)',
              borderRadius: 14, padding: '10px 14px',
            }}>
              <Avatar characterIndex={p.character_index ?? 0} pseudo={p.pseudo} size={40} />
              <div style={{ flex: 1 }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{p.pseudo}</span>
                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                  {i === 0 && <span style={{ color: '#a78bfa', fontSize: 11 }}>hôte</span>}
                  {p.is_guest && <span style={{ color: '#6b7280', fontSize: 11 }}>invité</span>}
                  {p.pseudo === user?.pseudo && <span style={{ color: '#6b7280', fontSize: 11 }}>toi</span>}
                </div>
              </div>
              {/* Kick button — host only, pas sur soi-même */}
              {isHost && p.pseudo !== user?.pseudo && (
                <button
                  onClick={() => handleKick(p.pseudo)}
                  style={{
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#f87171', borderRadius: 8,
                    padding: '4px 10px', cursor: 'pointer',
                    fontSize: 12, fontWeight: 700,
                  }}
                >
                  Kick
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bouton lancer */}
      {isHost && (
        <button
          onClick={handleStart}
          disabled={players.length < 3}
          style={{
            background: players.length >= 3 ? '#7c3aed' : 'rgba(124,58,237,0.3)',
            color: '#fff', fontWeight: 800, fontSize: 16,
            padding: '14px 40px', borderRadius: 14, border: 'none',
            cursor: players.length >= 3 ? 'pointer' : 'not-allowed',
            width: '100%', maxWidth: 420,
          }}
        >
          {players.length < 3 ? `En attente (${players.length}/3 min)` : 'Lancer la partie'}
        </button>
      )}

      {!isHost && (
        <p style={{ color: '#6b7280', fontSize: 14 }}>En attente que l'hôte lance la partie...</p>
      )}
    </div>
  );
}
