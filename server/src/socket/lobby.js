const pool = require('../db');
const jwt = require('jsonwebtoken');

module.exports = (io) => {
  io.on('connection', (socket) => {
    // Rejoindre un lobby
    socket.on('lobby:join', async ({ code, token }) => {
      try {
        const user = jwt.verify(token, process.env.JWT_SECRET);

        const roomResult = await pool.query('SELECT * FROM rooms WHERE code = $1', [code]);
        if (roomResult.rows.length === 0) {
          socket.emit('error', 'Partie introuvable');
          return;
        }

        const room = roomResult.rows[0];

        if (room.status !== 'waiting') {
          socket.emit('error', 'La partie a déjà commencé');
          return;
        }

        const playersResult = await pool.query(
          'SELECT * FROM players WHERE room_id = $1',
          [room.id]
        );

        if (playersResult.rows.length >= room.max_players) {
          socket.emit('error', 'La partie est pleine');
          return;
        }

        // Vérifier si déjà dans la room
        const alreadyIn = playersResult.rows.find((p) => p.pseudo === user.pseudo);

        let player;
        if (alreadyIn) {
          await pool.query('UPDATE players SET socket_id = $1 WHERE id = $2', [
            socket.id,
            alreadyIn.id,
          ]);
          player = { ...alreadyIn, socket_id: socket.id };
        } else {
          const insert = await pool.query(
            'INSERT INTO players (room_id, user_id, pseudo, is_guest, socket_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [room.id, user.id || null, user.pseudo, user.isGuest, socket.id]
          );
          player = insert.rows[0];
        }

        socket.join(code);
        socket.data.roomCode = code;
        socket.data.pseudo = user.pseudo;
        socket.data.roomId = room.id;

        // Récupérer la liste à jour
        const updated = await pool.query(
          'SELECT * FROM players WHERE room_id = $1',
          [room.id]
        );

        io.to(code).emit('lobby:update', {
          players: updated.rows,
          room,
        });

        socket.emit('lobby:joined', { player, room });
      } catch (err) {
        console.error(err);
        socket.emit('error', 'Erreur de connexion au lobby');
      }
    });

    // Quitter un lobby
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

    // Lancer la partie (host uniquement)
    socket.on('lobby:start', async ({ code, token }) => {
      try {
        jwt.verify(token, process.env.JWT_SECRET);

        const roomResult = await pool.query('SELECT * FROM rooms WHERE code = $1', [code]);
        const room = roomResult.rows[0];

        const players = await pool.query('SELECT * FROM players WHERE room_id = $1', [room.id]);

        if (players.rows.length < 3) {
          socket.emit('error', 'Il faut au moins 3 joueurs');
          return;
        }

        await pool.query('UPDATE rooms SET status = $1 WHERE code = $2', ['playing', code]);

        io.to(code).emit('game:start');
      } catch (err) {
        console.error(err);
        socket.emit('error', 'Erreur au lancement');
      }
    });
  });
};
