const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Générer un code de room court
const generateCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Créer une partie
router.post('/create', authMiddleware, async (req, res) => {
  const { maxPlayers, numImpostors } = req.body;

  if (!maxPlayers || maxPlayers < 3 || maxPlayers > 10) {
    return res.status(400).json({ error: 'Nombre de joueurs entre 3 et 10' });
  }
  if (!numImpostors || numImpostors < 1 || numImpostors >= maxPlayers - 1) {
    return res.status(400).json({ error: 'Nombre d\'imposteurs invalide' });
  }

  try {
    let code;
    let exists = true;
    while (exists) {
      code = generateCode();
      const check = await pool.query('SELECT id FROM rooms WHERE code = $1', [code]);
      exists = check.rows.length > 0;
    }

    const result = await pool.query(
      'INSERT INTO rooms (code, max_players, num_impostors) VALUES ($1, $2, $3) RETURNING *',
      [code, maxPlayers, numImpostors]
    );

    const room = result.rows[0];
    res.json({ room });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer une room par code
router.get('/:code', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM rooms WHERE code = $1', [req.params.code]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Partie introuvable' });
    }
    const room = result.rows[0];
    const players = await pool.query('SELECT * FROM players WHERE room_id = $1', [room.id]);
    res.json({ room, players: players.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
