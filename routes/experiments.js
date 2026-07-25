const express = require('express');
const db = require('../config/db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const experiments = require('../data/experiments.json');

const router = express.Router();

router.get('/', (req, res) => {
  const { category } = req.query;
  let list = experiments.map(({ id, title, category, aim }) => ({ id, title, category, aim }));
  if (category) list = list.filter(e => e.category === category);
  res.json({ count: list.length, experiments: list });
});

router.get('/categories', (req, res) => {
  const cats = [...new Set(experiments.map(e => e.category))];
  res.json({ categories: cats });
});

router.get('/:id', optionalAuth, (req, res) => {
  const exp = experiments.find(e => e.id === req.params.id);
  if (!exp) return res.status(404).json({ error: 'Experiment not found.' });
  let progress = null;
  if (req.user) {
    progress = db.prepare('SELECT * FROM experiment_progress WHERE user_id = ? AND experiment_id = ?').get(req.user.id, req.params.id) || null;
  }
  res.json({ experiment: exp, progress });
});

router.post('/:id/start', requireAuth, (req, res) => {
  const exp = experiments.find(e => e.id === req.params.id);
  if (!exp) return res.status(404).json({ error: 'Experiment not found.' });
  db.prepare(`
    INSERT INTO experiment_progress (user_id, experiment_id, status)
    VALUES (?, ?, 'in_progress')
    ON CONFLICT(user_id, experiment_id) DO NOTHING
  `).run(req.user.id, req.params.id);
  const progress = db.prepare('SELECT * FROM experiment_progress WHERE user_id = ? AND experiment_id = ?').get(req.user.id, req.params.id);
  res.json({ progress });
});

router.post('/:id/complete', requireAuth, (req, res) => {
  const exp = experiments.find(e => e.id === req.params.id);
  if (!exp) return res.status(404).json({ error: 'Experiment not found.' });
  const { score } = req.body;

  db.prepare(`
    INSERT INTO experiment_progress (user_id, experiment_id, status, score, completed_at)
    VALUES (?, ?, 'completed', ?, datetime('now'))
    ON CONFLICT(user_id, experiment_id) DO UPDATE SET status='completed', score=excluded.score, completed_at=datetime('now')
  `).run(req.user.id, req.params.id, score ?? null);

  const completedCount = db.prepare(`SELECT COUNT(*) as c FROM experiment_progress WHERE user_id = ? AND status = 'completed'`).get(req.user.id).c;
  if (completedCount >= 1) {
    try { db.prepare('INSERT OR IGNORE INTO badges (user_id, badge_key, badge_name) VALUES (?, ?, ?)').run(req.user.id, 'first_experiment', 'First Experiment Completed'); } catch (e) {}
  }
  if (completedCount >= 5) {
    try { db.prepare('INSERT OR IGNORE INTO badges (user_id, badge_key, badge_name) VALUES (?, ?, ?)').run(req.user.id, 'experiment_veteran', 'Experiment Veteran (5+)'); } catch (e) {}
  }

  const progress = db.prepare('SELECT * FROM experiment_progress WHERE user_id = ? AND experiment_id = ?').get(req.user.id, req.params.id);
  res.json({ progress });
});

router.get('/progress/mine', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM experiment_progress WHERE user_id = ?').all(req.user.id);
  res.json({ progress: rows });
});

module.exports = router;
