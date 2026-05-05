const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

const createToken = (user) => {
  return jwt.sign(
    { id: user.id, pseudo: user.pseudo, isGuest: user.is_guest },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Inscription compte
router.post('/register', async (req, res) => {
  const { pseudo, password } = req.body;

  if (!pseudo || !password) {
    return res.status(400).json({ error: 'Pseudo et mot de passe requis' });
  }
  if (pseudo.length < 2 || pseudo.length > 30) {
    return res.status(400).json({ error: 'Pseudo entre 2 et 30 caractères' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Mot de passe minimum 4 caractères' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE pseudo = $1', [pseudo]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Ce pseudo est déjà pris' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (pseudo, password_hash) VALUES ($1, $2) RETURNING id, pseudo',
      [pseudo, hash]
    );

    const user = result.rows[0];
    const token = createToken({ ...user, is_guest: false });
    res.json({ token, pseudo: user.pseudo, isGuest: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Connexion compte
router.post('/login', async (req, res) => {
  const { pseudo, password } = req.body;

  if (!pseudo || !password) {
    return res.status(400).json({ error: 'Pseudo et mot de passe requis' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE pseudo = $1', [pseudo]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Pseudo ou mot de passe incorrect' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Pseudo ou mot de passe incorrect' });
    }

    const token = createToken({ ...user, is_guest: false });
    res.json({ token, pseudo: user.pseudo, isGuest: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Connexion invité
router.post('/guest', async (req, res) => {
  const { pseudo } = req.body;

  if (!pseudo || pseudo.length < 2 || pseudo.length > 30) {
    return res.status(400).json({ error: 'Pseudo entre 2 et 30 caractères' });
  }

  const token = createToken({ id: null, pseudo, is_guest: true });
  res.json({ token, pseudo, isGuest: true });
});

module.exports = router;
