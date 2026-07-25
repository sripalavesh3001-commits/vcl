const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/student', requireAuth, (req, res) => {
  const userId = req.user.id;
  const completedExperiments = db.prepare(`SELECT experiment_id, score, completed_at FROM experiment_progress WHERE user_id = ? AND status = 'completed'`).all(userId);
  const inProgressExperiments = db.prepare(`SELECT experiment_id, started_at FROM experiment_progress WHERE user_id = ? AND status = 'in_progress'`).all(userId);
  const quizAttempts = db.prepare('SELECT * FROM quiz_attempts WHERE user_id = ? ORDER BY taken_at DESC LIMIT 10').all(userId);
  const badges = db.prepare('SELECT * FROM badges WHERE user_id = ? ORDER BY earned_at DESC').all(userId);
  const reactionCount = db.prepare('SELECT COUNT(*) as c FROM reaction_history WHERE user_id = ?').get(userId).c;
  const avgQuizScore = db.prepare('SELECT AVG(score_percent) as avg FROM quiz_attempts WHERE user_id = ?').get(userId).avg;

  const recentActivity = db.prepare(`
    SELECT 'experiment' as type, experiment_id as label, completed_at as ts FROM experiment_progress WHERE user_id = ? AND status='completed'
    UNION ALL
    SELECT 'quiz' as type, topic as label, taken_at as ts FROM quiz_attempts WHERE user_id = ?
    UNION ALL
    SELECT 'reaction' as type, equation as label, performed_at as ts FROM reaction_history WHERE user_id = ?
    ORDER BY ts DESC LIMIT 15
  `).all(userId, userId, userId);

  res.json({
    completedExperiments,
    inProgressExperiments,
    quizAttempts,
    badges,
    reactionCount,
    averageQuizScore: avgQuizScore ? +avgQuizScore.toFixed(1) : 0,
    recentActivity,
    progressPercent: Math.min(100, Math.round((completedExperiments.length / 7) * 100))
  });
});

module.exports = router;
