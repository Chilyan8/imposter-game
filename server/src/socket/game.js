const pool = require('../db');
const { getRandomWord } = require('../data/words');

const games = new Map();
const TURN_DURATION = 15;
const READY_TIMEOUT = 30000;

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

const findSocket = (io, code, pseudo) =>
  [...io.sockets.sockets.values()].find(
    (s) => s.data.pseudo === pseudo && s.data.roomCode === code
  );

// ─── INIT ─────────────────────────────────────────────────────────────────
const initGame = async (io, code, opts = {}) => {
  const roomResult = await pool.query('SELECT * FROM rooms WHERE code = $1', [code]);
  const room = roomResult.rows[0];

  const prev = games.get(code);
  const eliminated = prev?.eliminated || [];
  const round = (prev?.round || 0) + 1;

  const playersResult = await pool.query(
    'SELECT * FROM players WHERE room_id = $1',
    [room.id]
  );
  const allDbPlayers = playersResult.rows;
  const activePlayers = allDbPlayers.filter(p => !eliminated.includes(p.pseudo));

  // Réutiliser le mot si on continue après un légit éliminé
  const { word, theme } = opts.reuseWord && prev
    ? { word: prev.word, theme: prev.theme }
    : getRandomWord();

  // Assigner les rôles
  const numImpostors = Math.min(room.num_impostors, Math.floor(activePlayers.length / 2));
  const shuffledActive = shuffle(activePlayers);

  const assignedRoles = {};
  shuffledActive.forEach((p, i) => {
    assignedRoles[p.pseudo] = i < numImpostors ? 'impostor' : 'legit';
  });

  for (const p of activePlayers) {
    await pool.query('UPDATE players SET role = $1 WHERE id = $2', [
      assignedRoles[p.pseudo], p.id,
    ]);
  }

  // Index de personnage stable pour chaque joueur
  const characterMap = {};
  allDbPlayers.forEach((p, i) => { characterMap[p.pseudo] = i; });

  const turnOrder = shuffle(activePlayers.map(p => p.pseudo));

  const state = {
    code,
    roomId: room.id,
    word,
    theme,
    allPlayers: allDbPlayers.map(p => ({ pseudo: p.pseudo, characterIndex: characterMap[p.pseudo] })),
    activePseudos: activePlayers.map(p => p.pseudo),
    roles: assignedRoles,
    turnOrder,
    currentTurnIndex: 0,
    clues: [],
    phase: 'secret_reveal',
    round,
    votes: [],
    eliminated,
    timer: null,
    readyPlayers: new Set(),
    readyTimeout: null,
  };

  if (prev?.timer) clearInterval(prev.timer);
  if (prev?.readyTimeout) clearTimeout(prev.readyTimeout);
  games.set(code, state);

  // Envoyer la liste des joueurs à tout le monde
  io.to(code).emit('game:players', {
    allPlayers: state.allPlayers,
    eliminated: state.eliminated,
    round: state.round,
  });

  // Envoyer les secrets individuellement
  for (const p of activePlayers) {
    const sock = findSocket(io, code, p.pseudo);
    if (sock) {
      const role = assignedRoles[p.pseudo];
      sock.emit('game:secret', {
        word: role === 'legit' ? word : null,
        theme,
        round,
      });
    }
  }

  // Auto-démarrer après READY_TIMEOUT si tout le monde n'est pas prêt
  state.readyTimeout = setTimeout(() => {
    const s = games.get(code);
    if (s && s.phase === 'secret_reveal') {
      s.phase = 'playing';
      startTurn(io, code);
    }
  }, READY_TIMEOUT);
};

// ─── READY ────────────────────────────────────────────────────────────────
const markReady = (io, code, pseudo) => {
  const state = games.get(code);
  if (!state || state.phase !== 'secret_reveal') return;

  state.readyPlayers.add(pseudo);

  if (state.readyPlayers.size >= state.activePseudos.length) {
    if (state.readyTimeout) clearTimeout(state.readyTimeout);
    state.phase = 'playing';
    startTurn(io, code);
  }
};

// ─── TOURS ────────────────────────────────────────────────────────────────
const startTurn = (io, code) => {
  const state = games.get(code);
  if (!state || state.phase !== 'playing') return;
  if (state.timer) clearInterval(state.timer);

  const currentPseudo = state.turnOrder[state.currentTurnIndex];
  let timeLeft = TURN_DURATION;

  io.to(code).emit('game:turn', {
    currentPlayer: currentPseudo,
    turnIndex: state.currentTurnIndex,
    totalTurns: state.turnOrder.length,
    timeLeft,
    clues: state.clues,
  });

  state.timer = setInterval(() => {
    timeLeft--;
    io.to(code).emit('game:timer', { timeLeft, currentPlayer: currentPseudo });

    if (timeLeft <= 0) {
      clearInterval(state.timer);
      const already = state.clues.find(c => c.pseudo === currentPseudo);
      if (!already) {
        state.clues.push({ pseudo: currentPseudo, word: null });
        io.to(code).emit('game:clue', { pseudo: currentPseudo, word: null });
      }
      nextTurn(io, code);
    }
  }, 1000);
};

const nextTurn = (io, code) => {
  const state = games.get(code);
  if (!state) return;
  if (state.timer) clearInterval(state.timer);

  state.currentTurnIndex++;
  if (state.currentTurnIndex >= state.turnOrder.length) {
    startVote(io, code);
  } else {
    startTurn(io, code);
  }
};

// ─── VOTE ─────────────────────────────────────────────────────────────────
const startVote = (io, code) => {
  const state = games.get(code);
  if (!state) return;
  state.phase = 'voting';
  state.votes = [];

  io.to(code).emit('game:vote_phase', {
    activePlayers: state.activePseudos,
    clues: state.clues,
  });
};

const processVotes = async (io, code) => {
  const state = games.get(code);
  if (!state) return;

  const counts = {};
  state.votes.forEach(({ target }) => {
    counts[target] = (counts[target] || 0) + 1;
  });

  const maxVotes = Math.max(...Object.values(counts), 0);
  const topTargets = Object.entries(counts).filter(([, c]) => c === maxVotes);

  // Égalité → pas d'élimination, relancer les tours
  if (topTargets.length > 1) {
    state.phase = 'tie';
    io.to(code).emit('game:tie', { counts });

    setTimeout(() => {
      state.clues = [];
      state.votes = [];
      state.phase = 'playing';
      state.currentTurnIndex = 0;
      state.turnOrder = shuffle(state.activePseudos);
      io.to(code).emit('game:restart_turn', { clues: [], eliminated: state.eliminated });
      startTurn(io, code);
    }, 4000);
    return;
  }

  const eliminatedPseudo = topTargets[0][0];
  const eliminatedRole = state.roles[eliminatedPseudo];

  state.eliminated.push(eliminatedPseudo);
  state.activePseudos = state.activePseudos.filter(p => p !== eliminatedPseudo);

  await pool.query(
    'UPDATE players SET is_eliminated = true WHERE room_id = $1 AND pseudo = $2',
    [state.roomId, eliminatedPseudo]
  );

  io.to(code).emit('game:eliminated', {
    pseudo: eliminatedPseudo,
    role: eliminatedRole,
    counts,
    eliminated: state.eliminated,
  });

  setTimeout(async () => {
    const impostors = state.activePseudos.filter(p => state.roles[p] === 'impostor');
    const legits = state.activePseudos.filter(p => state.roles[p] === 'legit');

    if (impostors.length === 0) {
      io.to(code).emit('game:end', { winner: 'legit', word: state.word, players: buildEndPlayers(state) });
      await pool.query('UPDATE rooms SET status = $1 WHERE code = $2', ['finished', code]);
      games.delete(code);
      return;
    }

    if (impostors.length >= legits.length) {
      io.to(code).emit('game:end', { winner: 'impostor', word: state.word, players: buildEndPlayers(state) });
      await pool.query('UPDATE rooms SET status = $1 WHERE code = $2', ['finished', code]);
      games.delete(code);
      return;
    }

    // Légit éliminé → continuer avec le même mot
    if (eliminatedRole === 'legit') {
      state.clues = [];
      state.votes = [];
      state.phase = 'playing';
      state.currentTurnIndex = 0;
      state.turnOrder = shuffle(state.activePseudos);
      state.round++;

      io.to(code).emit('game:continue', {
        eliminated: state.eliminated,
        round: state.round,
        clues: [],
      });

      startTurn(io, code);
    }
  }, 5000);
};

const buildEndPlayers = (state) => {
  return state.allPlayers.map(p => ({
    pseudo: p.pseudo,
    characterIndex: p.characterIndex,
    role: state.roles[p.pseudo] || 'legit',
    eliminated: state.eliminated.includes(p.pseudo),
  }));
};

// ─── EXPORT ───────────────────────────────────────────────────────────────
module.exports = (io) => {
  io.on('connection', (socket) => {

    socket.on('game:join', ({ code, pseudo }) => {
      socket.join(code);
      socket.data.roomCode = code;
      socket.data.pseudo = pseudo;

      const state = games.get(code);
      if (!state) return;

      // Renvoyer l'état courant
      socket.emit('game:players', {
        allPlayers: state.allPlayers,
        eliminated: state.eliminated,
        round: state.round,
      });

      if (state.phase === 'secret_reveal') {
        const role = state.roles[pseudo];
        if (role) {
          socket.emit('game:secret', {
            word: role === 'legit' ? state.word : null,
            theme: state.theme,
            round: state.round,
          });
        }
      }

      if (state.phase === 'playing') {
        const currentPseudo = state.turnOrder[state.currentTurnIndex];
        socket.emit('game:turn', {
          currentPlayer: currentPseudo,
          turnIndex: state.currentTurnIndex,
          totalTurns: state.turnOrder.length,
          timeLeft: TURN_DURATION,
          clues: state.clues,
        });
      }

      if (state.phase === 'voting') {
        socket.emit('game:vote_phase', {
          activePlayers: state.activePseudos,
          clues: state.clues,
        });
        if (state.votes.length > 0) {
          socket.emit('game:votes_update', { votes: state.votes });
        }
      }
    });

    socket.on('game:init', async ({ code }) => {
      try {
        if (!games.has(code)) {
          await initGame(io, code);
        }
      } catch (err) {
        console.error('game:init error', err);
        socket.emit('error', 'Erreur au démarrage de la partie');
      }
    });

    socket.on('game:ready', ({ code }) => {
      markReady(io, code, socket.data.pseudo);
    });

    socket.on('game:submit_clue', ({ code, word }) => {
      const state = games.get(code);
      if (!state || state.phase !== 'playing') return;

      const pseudo = socket.data.pseudo;
      if (pseudo !== state.turnOrder[state.currentTurnIndex]) return;
      if (state.clues.find(c => c.pseudo === pseudo)) return;

      if (state.timer) clearInterval(state.timer);

      const clueWord = (word || '').trim().slice(0, 50);
      state.clues.push({ pseudo, word: clueWord || null });
      io.to(code).emit('game:clue', { pseudo, word: clueWord || null });

      nextTurn(io, code);
    });

    socket.on('game:vote', ({ code, target }) => {
      const state = games.get(code);
      if (!state || state.phase !== 'voting') return;

      const voter = socket.data.pseudo;
      if (!voter || voter === target) return;
      if (state.votes.find(v => v.voter === voter)) return;
      if (!state.activePseudos.includes(target)) return;

      state.votes.push({ voter, target });
      io.to(code).emit('game:votes_update', { votes: state.votes });

      if (state.votes.length >= state.activePseudos.length) {
        processVotes(io, code);
      }
    });
  });
};
