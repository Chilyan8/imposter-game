const pool = require('../db');
const jwt = require('jsonwebtoken');

module.exports = (io) => {
  io.on('connection', (socket) => {

    socket.on('lobby:join', async ({ code, token, characterIndex }) => {
      try {
        const user = jwt.verify(token, process.env.JWT_SECRET);

        const roomResult = await pool.query('SELECT * FROM rooms WHERE code = $1', [code]);
        if (!roomResult.rows.length) { socket.emit('error', 'Partie introuvable'); return; }
        const room = roomResult.rows[0];

        if (room.status !== 'waiting') { socket.emit('error', 'La partie a déjà commencé'); return; }

        const playersResult = await pool.query('SELECT * FROM players WHERE room_id = $1', [room.id]);

        if (playersResult.rows.length >= room.max_players) { socket.emit('error', 'La partie est pleine'); return; }

        // Vérifier si le personnage est déjà pris
        const charIdx = characterIndex ?? 0;
        const charTaken = playersResult.rows.find(p => p.character_index === charIdx && p.pseudo !== user.pseudo);
        if (charTaken) { socket.emit('error', 'Ce personnage est déjà pris'); return; }

        const alreadyIn = playersResult.rows.find(p => p.pseudo === user.pseudo);
        let player;

        if (alreadyIn) {
          await pool.query(
            'UPDATE players SET socket_id = $1, character_index = $2 WHERE id = $3',
            [socket.id, charIdx, alreadyIn.id]
          );
          player = { ...alreadyIn, socket_id: socket.id, character_index: charIdx };
        } else {
          const insert = await pool.query(
            'INSERT INTO players (room_id, user_id, pseudo, is_guest, socket_id, character_index) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
            [room.id, user.id || null, user.pseudo, user.isGuest, socket.id, charIdx]
          );
          player = insert.rows[0];
        }

        socket.join(code);
        socket.data.roomCode = code;
        socket.data.pseudo = user.pseudo;
        socket.data.roomId = room.id;

        const updated = await pool.query('SELECT * FROM players WHERE room_id = $1 ORDER BY id ASC', [room.id]);
        io.to(code).emit('lobby:update', { players: updated.rows, room });
        socket.emit('lobby:joined', { player, room });

      } catch (err) {
        console.error('lobby:join error', err);
        socket.emit('error', 'Erreur de connexion au lobby');
      }
    });

    socket.on('lobby:kick', async ({ code, token, targetPseudo }) => {
      try {
        const user = jwt.verify(token, process.env.JWT_SECRET);

        const roomResult = await pool.query('SELECT * FROM rooms WHERE code = $1', [code]);
        if (!roomResult.rows.length) return;
        const room = roomResult.rows[0];

        // Vérifier que l'émetteur est le host (premier joueur)
        const playersResult = await pool.query('SELECT * FROM players WHERE room_id = $1 ORDER BY id ASC', [room.id]);
        if (playersResult.rows[0]?.pseudo !== user.pseudo) return;

        // Supprimer le joueur ciblé
        await pool.query('DELETE FROM players WHERE room_id = $1 AND pseudo = $2', [room.id, targetPseudo]);

        // Notifier le joueur kické
        const targetSocket = [...io.sockets.sockets.values()].find(
          s => s.data.pseudo === targetPseudo && s.data.roomCode === code
        );
        if (targetSocket) {
          targetSocket.emit('lobby:kicked');
          targetSocket.leave(code);
          targetSocket.data.roomCode = null;
          targetSocket.data.roomId = null;
        }

        const updated = await pool.query('SELECT * FROM players WHERE room_id = $1 ORDER BY id ASC', [room.id]);
        io.to(code).emit('lobby:update', { players: updated.rows, room });

      } catch (err) {
        console.error('lobby:kick error', err);
      }
    });

    socket.on('lobby:start', async ({ code, token }) => {
      try {
        jwt.verify(token, process.env.JWT_SECRET);

        const roomResult = await pool.query('SELECT * FROM rooms WHERE code = $1', [code]);
        const room = roomResult.rows[0];
        const players = await pool.query('SELECT * FROM players WHERE room_id = $1', [room.id]);

        if (players.rows.length < 3) { socket.emit('error', 'Il faut au moins 3 joueurs'); return; }

        await pool.query('UPDATE rooms SET status = $1 WHERE code = $2', ['playing', code]);
        io.to(code).emit('game:start');

      } catch (err) {
        console.error('lobby:start error', err);
        socket.emit('error', 'Erreur au lancement');
      }
    });

    socket.on('disconnect', async () => {
      const { roomCode, pseudo, roomId } = socket.data || {};
      if (!roomCode || !roomId) return;
      try {
        await pool.query('DELETE FROM players WHERE room_id = $1 AND pseudo = $2', [roomId, pseudo]);
        const updated = await pool.query('SELECT * FROM players WHERE room_id = $1 ORDER BY id ASC', [roomId]);
        io.to(roomCode).emit('lobby:update', { players: updated.rows });
      } catch (err) {
        console.error('disconnect cleanup error', err);
      }
    });
  });
};
