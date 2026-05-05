const pool = require('../db');
const { getRandomWord } = require('../data/words');

const games = new Map();
const TURN_DURATION = 15;

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

const getActiveState = (code) => games.get(code);

const broadcastState = (io, code) => {
  const state = games.get(code);
  if (!state) return;
  io.to(code).emit('game:state', {
    phase: state.phase,
    clues: state.clues,
    round: state.round,
    currentPlayer: state.turnOrder[state.currentTurnIndex] || null,
    turnIndex: state.currentTurnIndex,
    totalTurns: state.turnOrder.length,
    eliminated: state.eliminated,
  });
};

const initGame = async (io, code) => {
  const roomResult = await pool.query('SELECT * FROM rooms WHERE code = $1', [code]);
  const room = roomResult.rows[0];

  const playersResult = await pool.query(
    'SELECT * FROM players WHERE room_id = $1 AND is_eliminated = false',
    [room.id]
  );
  const players = playersResult.rows;

  const { word, theme } = getRandomWord();

  const shuffled = shuffle(players);
  const numImpostors = Math.min(room.num_impostors, Math.floor(players.length / 2));

  const assigned = shuffled.map((p, i) => ({
    ...p,
    role: i < numImpostors ? 'impostor' : 'legit',
  }));

  for (const p of assigned) {
    await pool.query('UPDATE players SET role = $1 WHERE id = $2', [p.role, p.id]);
  }

  const roundNum = (games.get(code)?.round || 0) + 1;

  await pool.query(
    'INSERT INTO rounds (room_id, word, theme, round_number) VALUES ($1, $2, $3, $4)',
    [room.id, word, theme, roundNum]
  );

  const turnOrder = shuffle(assigned).map((p) => p.pseudo);

  const state = {
    code,
    roomId: room.id,
    players: assigned,
    word,
    theme,
    turnOrder,
    currentTurnIndex: 0,
    clues: [],
    phase: 'playing',
    round: roundNum,
    votes: [],
    eliminated: games.get(code)?.eliminated || [],
    timer: null,
    readyPlayers: new Set(),
  };

  games.set(code, state);

  // Envoyer les rôles individuellement
  sendRoles(io, code);

  return state;
};

const sendRoles = (io, code) => {
  const state = games.get(code);
  if (!state) return;

  for (const p of state.players) {
    if (state.eliminated.includes(p.pseudo)) continue;
    const targetSocket = findSocket(io, code, p.pseudo);
    if (targetSocket) {
      targetSocket.emit('game:role', {
        role: p.role,
        word: p.role === 'legit' ? state.word : null,
        theme: state.theme,
        round: state.round,
      });
    }
  }
};

const findSocket = (io, code, pseudo) => {
  return [...io.sockets.sockets.values()].find(
    (s) => s.data.pseudo === pseudo && s.data.roomCode === code
  );
};

const startTurn = (io, code) => {
  const state = games.get(code);
  if (!state || state.phase !== 'playing') return;

  if (state.timer) clearInterval(state.timer);

  const currentPseudo = state.turnOrder[state.currentTurnIndex];
  let timeLeft = TURN_DURATION;

  broadcastState(io, code);
  io.to(code).emit('game:turn_start', { currentPlayer: currentPseudo, timeLeft });

  state.timer = setInterval(() => {
    timeLeft--;
    io.to(code).emit('game:timer', { timeLeft, currentPlayer: currentPseudo });

    if (timeLeft <= 0) {
      clearInterval(state.timer);
      const alreadySubmitted = state.clues.find((c) => c.pseudo === currentPseudo);
      if (!alreadySubmitted) {
        state.clues.push({ pseudo: currentPseudo, word: '⏱ passé' });
        broadcastState(io, code);
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

const startVote = (io, code) => {
  const state = games.get(code);
  if (!state) return;

  state.phase = 'voting';
  state.votes = [];

  const activePlayers = state.players
    .filter((p) => !state.eliminated.includes(p.pseudo))
    .map((p) => p.pseudo);

  broadcastState(io, code);
  io.to(code).emit('game:vote_start', {
    players: activePlayers,
    clues: state.clues,
  });
};

const checkWin = (io, code) => {
  const state = games.get(code);
  if (!state) return false;

  const active = state.players.filter((p) => !state.eliminated.includes(p.pseudo));
  const impostors = active.filter((p) => p.role === 'impostor');
  const legits = active.filter((p) => p.role === 'legit');

  if (impostors.length === 0) {
    io.to(code).emit('game:end', { winner: 'legit', word: state.word, players: state.players });
    pool.query('UPDATE rooms SET status = $1 WHERE code = $2', ['finished', code]);
    games.delete(code);
    return true;
  }

  if (impostors.length >= legits.length) {
    io.to(code).emit('game:end', { winner: 'impostor', word: state.word, players: state.players });
    pool.query('UPDATE rooms SET status = $1 WHERE code = $2', ['finished', code]);
    games.delete(code);
    return true;
  }

  return false;
};

module.exports = (io) => {
  io.on('connection', (socket) => {

    socket.on('game:join', async ({ code, pseudo }) => {
      socket.join(code);
      socket.data.roomCode = code;
      if (pseudo) socket.data.pseudo = pseudo;

      const state = games.get(code);
      if (state) {
        broadcastState(io, code);
        // Renvoyer le rôle si déjà assigné
        const player = state.players.find((p) => p.pseudo === socket.data.pseudo);
        if (player) {
          socket.emit('game:role', {
            role: player.role,
            word: player.role === 'legit' ? state.word : null,
            theme: state.theme,
            round: state.round,
          });
        }
      }
    });

    socket.on('game:init', async ({ code }) => {
      try {
        if (!games.has(code)) {
          await initGame(io, code);
          startTurn(io, code);
        }
      } catch (err) {
        console.error('game:init error', err);
        socket.emit('error', 'Erreur initialisation de la partie');
      }
    });

    socket.on('game:submit_clue', ({ code, word }) => {
      const state = games.get(code);
      if (!state || state.phase !== 'playing') return;

      const pseudo = socket.data.pseudo;
      const currentPseudo = state.turnOrder[state.currentTurnIndex];
      if (pseudo !== currentPseudo) return;

      const alreadySubmitted = state.clues.find((c) => c.pseudo === pseudo);
      if (alreadySubmitted) return;

      if (state.timer) clearInterval(state.timer);

      const clueWord = (word || '').trim().slice(0, 50) || '(vide)';
      state.clues.push({ pseudo, word: clueWord });

      broadcastState(io, code);
      nextTurn(io, code);
    });

    socket.on('game:vote', ({ code, target }) => {
      const state = games.get(code);
      if (!state || state.phase !== 'voting') return;

      const voter = socket.data.pseudo;
      if (!voter || voter === target) return;

      const alreadyVoted = state.votes.find((v) => v.voter === voter);
      if (alreadyVoted) return;

      const activePlayers = state.players.filter((p) => !state.eliminated.includes(p.pseudo));
      const validTarget = activePlayers.find((p) => p.pseudo === target);
      if (!validTarget) return;

      state.votes.push({ voter, target });

      const voteCount = {};
      state.votes.forEach(({ target }) => {
        voteCount[target] = (voteCount[target] || 0) + 1;
      });

      io.to(code).emit('game:vote_update', {
        votes: state.votes.length,
        total: activePlayers.length,
        voteCount,
      });

      if (state.votes.length >= activePlayers.length) {
        const eliminated = Object.entries(voteCount).sort((a, b) => b[1] - a[1])[0][0];
        const eliminatedPlayer = state.players.find((p) => p.pseudo === eliminated);

        state.eliminated.push(eliminated);
        state.phase = 'result';

        pool.query(
          'UPDATE players SET is_eliminated = true WHERE room_id = $1 AND pseudo = $2',
          [state.roomId, eliminated]
        );

        io.to(code).emit('game:eliminated', {
          pseudo: eliminated,
          role: eliminatedPlayer?.role,
          voteCount,
        });

        setTimeout(async () => {
          if (!checkWin(io, code)) {
            await initGame(io, code);
            startTurn(io, code);
          }
        }, 5000);
      }
    });

    socket.on('disconnect', async () => {
      const { roomCode, pseudo, roomId } = socket.data || {};
      if (!roomCode || !roomId) return;
      try {
        await pool.query(
          'DELETE FROM players WHERE room_id = $1 AND pseudo = $2',
          [roomId, pseudo]
        );
        const updated = await pool.query(
          'SELECT * FROM players WHERE room_id = $1',
          [roomId]
        );
        io.to(roomCode).emit('lobby:update', { players: updated.rows });
      } catch (err) {
        console.error(err);
      }
    });
  });
};
