const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Notes
router.get('/notes', requireAuth, (req, res) => {
  res.json({ notes: db.prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id) });
});
router.post('/notes', requireAuth, (req, res) => {
  const { title, content } = req.body;
  if (!title) return res.status(400).json({ error: 'A note title is required.' });
  const info = db.prepare('INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)').run(req.user.id, title, content || '');
  res.status(201).json({ note: db.prepare('SELECT * FROM notes WHERE id = ?').get(info.lastInsertRowid) });
});
router.delete('/notes/:id', requireAuth, (req, res) => {
  const info = db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Note not found.' });
  res.json({ success: true });
});

// Favorites
router.get('/favorites', requireAuth, (req, res) => {
  res.json({ favorites: db.prepare('SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id) });
});
router.post('/favorites', requireAuth, (req, res) => {
  const { itemType, itemKey } = req.body;
  if (!itemType || !itemKey) return res.status(400).json({ error: 'itemType and itemKey are required.' });
  try {
    db.prepare('INSERT OR IGNORE INTO favorites (user_id, item_type, item_key) VALUES (?, ?, ?)').run(req.user.id, itemType, itemKey);
    res.status(201).json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
router.delete('/favorites', requireAuth, (req, res) => {
  const { itemType, itemKey } = req.body;
  db.prepare('DELETE FROM favorites WHERE user_id = ? AND item_type = ? AND item_key = ?').run(req.user.id, itemType, itemKey);
  res.json({ success: true });
});

module.exports = router;
