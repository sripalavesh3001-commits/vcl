// Login and registration pages/endpoints have been removed. This file only
// keeps a `/me` endpoint so the frontend can fetch the current (demo) user.
const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/me', requireAuth, (req, res) => {
  const row = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!row) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: row });
});

module.exports = router;
