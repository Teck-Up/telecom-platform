const express = require('express');
const router = express.Router();
const db = require('../models/db');
const bcrypt = require('bcrypt');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, role, is_active } = req.body;
    await db.query('UPDATE users SET name=?, role=?, is_active=? WHERE id=?', [name, role, is_active, req.params.id]);
    res.json({ success: true, message: 'Utilisateur mis à jour' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

router.put('/:id/password', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== Number(req.params.id))
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    const { password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET password=? WHERE id=?', [hashed, req.params.id]);
    res.json({ success: true, message: 'Mot de passe mis à jour' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const [[user]] = await db.query('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
