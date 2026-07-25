const express = require('express');
const db = require('../config/db');
const { optionalAuth } = require('../middleware/auth');
const reactions = require('../data/reactions.json');
const reagents = require('../data/reagents.json');
const elements = require('../data/elements.json');

const router = express.Router();

function normalizeSet(arr) {
  return [...arr].map(s => s.trim()).sort().join('|').toLowerCase();
}

// Build a lookup index once
const reactionIndex = new Map();
for (const r of reactions) {
  reactionIndex.set(normalizeSet(r.reactants), r);
}

router.get('/', (req, res) => {
  res.json({ count: reactions.length, reactions: reactions.map(({ id, reactants, type, equation }) => ({ id, reactants, type, equation })) });
});

router.get('/:id', (req, res) => {
  const r = reactions.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Reaction not found.' });
  res.json({ reaction: r });
});

// POST /api/reactions/mix { chemicals: ["Zn", "HCl"] }
router.post('/mix', optionalAuth, (req, res) => {
  const { chemicals } = req.body;
  if (!Array.isArray(chemicals) || chemicals.length < 2) {
    return res.status(400).json({ error: 'Provide at least two chemicals (element symbols or reagent formulas) to mix.' });
  }

  const key = normalizeSet(chemicals);
  const match = reactionIndex.get(key);

  // Validate the chemicals exist in our catalog
  const unknown = chemicals.filter(c =>
    !elements.some(e => e.symbol.toLowerCase() === c.toLowerCase()) &&
    !reagents.some(r => r.formula.toLowerCase() === c.toLowerCase())
  );
  if (unknown.length) {
    return res.status(404).json({ error: `Unknown chemical(s): ${unknown.join(', ')}. Add them from the Periodic Table or Reagent shelf first.` });
  }

  if (!match) {
    return res.json({
      reacted: false,
      reason: 'no_data',
      message: `No known reaction occurs between ${chemicals.join(' and ')} under normal laboratory conditions, or this combination is not yet in the reaction library. This can mean the substances are unreactive together, incompatible with a simulated pathway, or require conditions (e.g. a specific catalyst, extreme temperature) outside standard lab conditions.`
    });
  }

  if (match.type === 'No Reaction') {
    if (req.user) {
      db.prepare('INSERT INTO reaction_history (user_id, reactants, reaction_id, equation, result_type) VALUES (?, ?, ?, ?, ?)')
        .run(req.user.id, JSON.stringify(chemicals), match.id, match.equation, 'no_reaction');
    }
    return res.json({ reacted: false, reason: 'unreactive', reaction: match, message: match.noReactionReason });
  }

  if (req.user) {
    db.prepare('INSERT INTO reaction_history (user_id, reactants, reaction_id, equation, result_type) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.id, JSON.stringify(chemicals), match.id, match.equation, 'reacted');
    try {
      db.prepare('INSERT OR IGNORE INTO badges (user_id, badge_key, badge_name) VALUES (?, ?, ?)')
        .run(req.user.id, 'first_reaction', 'First Reaction Performed');
    } catch (e) { /* ignore */ }
  }

  res.json({ reacted: true, reaction: match });
});

router.get('/history/mine', require('../middleware/auth').requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM reaction_history WHERE user_id = ? ORDER BY performed_at DESC LIMIT 100').all(req.user.id);
  res.json({ history: rows.map(r => ({ ...r, reactants: JSON.parse(r.reactants) })) });
});

module.exports = router;
