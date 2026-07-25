const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const bank = require('../data/quizzes.json');
const elements = require('../data/elements.json');

const router = express.Router();

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Dynamically generate unlimited periodic-table MCQs from element data
function generateElementQuestions(count) {
  const questions = [];
  const pool = shuffle(elements).slice(0, count);
  for (const el of pool) {
    const kind = Math.floor(Math.random() * 3);
    const distractors = shuffle(elements.filter(e => e.atomicNumber !== el.atomicNumber)).slice(0, 3);
    if (kind === 0) {
      const options = shuffle([el.symbol, ...distractors.map(d => d.symbol)]);
      questions.push({
        id: `gen-sym-${el.atomicNumber}`, topic: 'Periodic Table', type: 'mcq',
        question: `What is the chemical symbol for ${el.name}?`,
        options, answer: options.indexOf(el.symbol),
        explanation: `${el.name} has the symbol ${el.symbol} and atomic number ${el.atomicNumber}.`
      });
    } else if (kind === 1) {
      const options = shuffle([el.categoryLabel, ...distractors.map(d => d.categoryLabel)]);
      questions.push({
        id: `gen-cat-${el.atomicNumber}`, topic: 'Periodic Table', type: 'mcq',
        question: `${el.name} (${el.symbol}) belongs to which category of elements?`,
        options, answer: options.indexOf(el.categoryLabel),
        explanation: `${el.name} is classified as a ${el.categoryLabel}.`
      });
    } else {
      const options = shuffle([String(el.atomicNumber), ...distractors.map(d => String(d.atomicNumber))]);
      questions.push({
        id: `gen-num-${el.atomicNumber}`, topic: 'Periodic Table', type: 'mcq',
        question: `What is the atomic number of ${el.name} (${el.symbol})?`,
        options, answer: options.indexOf(String(el.atomicNumber)),
        explanation: `${el.name} has atomic number ${el.atomicNumber}.`
      });
    }
  }
  return questions;
}

// GET /api/quiz/generate?type=mcq&count=10&topic=Periodic Table
router.get('/generate', (req, res) => {
  const count = Math.min(parseInt(req.query.count, 10) || 10, 50);
  const topic = req.query.topic;
  const type = req.query.type || 'mixed';

  let questions = [];
  if (type === 'mcq' || type === 'mixed') {
    let staticMcq = bank.mcq.map(q => ({ ...q, type: 'mcq' }));
    if (topic) staticMcq = staticMcq.filter(q => q.topic === topic);
    questions.push(...staticMcq);
    if (!topic || topic === 'Periodic Table') {
      questions.push(...generateElementQuestions(Math.max(5, Math.floor(count / 2))));
    }
  }
  if (type === 'trueFalse' || type === 'mixed') {
    questions.push(...bank.trueFalse.map(q => ({ ...q, type: 'trueFalse' })));
  }
  if (type === 'fillBlanks' || type === 'mixed') {
    questions.push(...bank.fillBlanks.map(q => ({ ...q, type: 'fillBlanks' })));
  }
  if (type === 'matchTheFollowing' || type === 'mixed') {
    questions.push(...bank.matchTheFollowing.map(q => ({ ...q, type: 'matchTheFollowing' })));
  }

  questions = shuffle(questions).slice(0, count);
  res.json({ count: questions.length, questions });
});

router.get('/topics', (req, res) => {
  const topics = [...new Set(bank.mcq.map(q => q.topic))];
  res.json({ topics: ['Periodic Table', ...topics] });
});

router.post('/submit', requireAuth, (req, res) => {
  const { topic, totalQuestions, correctAnswers } = req.body;
  if (totalQuestions == null || correctAnswers == null) {
    return res.status(400).json({ error: 'Provide totalQuestions and correctAnswers.' });
  }
  const scorePercent = totalQuestions > 0 ? +((correctAnswers / totalQuestions) * 100).toFixed(2) : 0;
  db.prepare(`
    INSERT INTO quiz_attempts (user_id, topic, total_questions, correct_answers, score_percent)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.user.id, topic || 'Mixed', totalQuestions, correctAnswers, scorePercent);

  if (scorePercent === 100) {
    try { db.prepare('INSERT OR IGNORE INTO badges (user_id, badge_key, badge_name) VALUES (?, ?, ?)').run(req.user.id, 'perfect_quiz', 'Perfect Quiz Score'); } catch (e) {}
  }

  res.json({ scorePercent });
});

router.get('/history/mine', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM quiz_attempts WHERE user_id = ? ORDER BY taken_at DESC LIMIT 50').all(req.user.id);
  res.json({ history: rows });
});

module.exports = router;
