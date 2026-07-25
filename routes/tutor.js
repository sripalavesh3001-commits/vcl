const express = require('express');
const db = require('../config/db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const reactions = require('../data/reactions.json');
const elements = require('../data/elements.json');

const router = express.Router();

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const SYSTEM_PROMPT = `You are the AI Chemistry Tutor inside a Virtual Chemistry Lab web app used by students.
Explain chemistry concepts, reactions, mechanisms, and equation-balancing clearly and accurately.
Adapt your depth to the mode the student selects: "beginner" (simple language, everyday analogies, avoid heavy jargon)
or "advanced" (rigorous terminology, mechanisms, thermodynamics/kinetics detail).
Keep answers focused and well-structured. When asked to balance an equation, show the balanced equation clearly.
When asked to predict products, state the likely products and reaction type. Stay strictly within chemistry, lab safety,
and chemistry-education topics relevant to this app.`;

function isConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Very small rule-based fallback so the tutor is usable before an API key is added.
function fallbackReply(message, mode) {
  const q = message.toLowerCase();

  // Try to find a matching known reaction by reactant formula mentions
  const found = reactions.find(r => r.reactants.every(f => q.includes(f.toLowerCase())));
  if (found) {
    return `Here's what I know about this from the reaction library:\n\n` +
      `**${found.type}**\n${found.equation}\n\n` +
      `Observation: ${found.observation}\n` +
      `Mechanism: ${found.mechanism}\n\n` +
      `(This is a offline, rule-based answer. Connect an Anthropic API key in the server environment to enable the full conversational AI tutor.)`;
  }

  const elMatch = elements.find(e => q.includes(e.name.toLowerCase()) || q.includes(` ${e.symbol.toLowerCase()} `));
  if (elMatch) {
    return `${elMatch.name} (${elMatch.symbol}) is a ${elMatch.categoryLabel.toLowerCase()} with atomic number ${elMatch.atomicNumber}, ` +
      `atomic mass ${elMatch.atomicMass}, and electron configuration ${elMatch.electronConfiguration}. ` +
      `${elMatch.naturalOccurrence}.\n\n` +
      `(This is an offline, rule-based answer. Connect an Anthropic API key in the server environment to enable the full conversational AI tutor.)`;
  }

  return `I can look up known reactions and periodic table facts right now, but the full conversational AI Chemistry Tutor ` +
    `needs an Anthropic API key configured on the server (set ANTHROPIC_API_KEY in your environment) to answer open-ended ` +
    `questions like this one. Once that's set, I'll be able to explain mechanisms, balance any equation, and guide you ` +
    `through experiments in ${mode === 'advanced' ? 'advanced' : 'beginner'} mode.`;
}

router.get('/status', (req, res) => {
  res.json({ configured: isConfigured(), model: ANTHROPIC_MODEL });
});

router.post('/chat', optionalAuth, async (req, res) => {
  const { message, mode, history } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'A "message" string is required.' });
  }
  const tutorMode = mode === 'advanced' ? 'advanced' : 'beginner';

  let replyText;
  let source = 'offline';

  if (isConfigured()) {
    try {
      const messages = [
        ...(Array.isArray(history) ? history.slice(-10).map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })) : []),
        { role: 'user', content: message }
      ];
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 1024,
          system: `${SYSTEM_PROMPT}\nCurrent mode: ${tutorMode}.`,
          messages
        })
      });
      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Anthropic API error ${response.status}: ${errBody}`);
      }
      const data = await response.json();
      replyText = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      source = 'anthropic';
      if (!replyText) throw new Error('Empty response from model');
    } catch (err) {
      console.error('Tutor API call failed, falling back:', err.message);
      replyText = fallbackReply(message, tutorMode);
      source = 'offline_fallback';
    }
  } else {
    replyText = fallbackReply(message, tutorMode);
  }

  if (req.user) {
    try {
      db.prepare(`INSERT INTO tutor_conversations (user_id, role, content) VALUES (?, 'user', ?)`).run(req.user.id, message);
      db.prepare(`INSERT INTO tutor_conversations (user_id, role, content) VALUES (?, 'assistant', ?)`).run(req.user.id, replyText);
    } catch (e) { /* non-fatal */ }
  }

  res.json({ reply: replyText, source, mode: tutorMode });
});

router.get('/history', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT role, content, created_at FROM tutor_conversations WHERE user_id = ? ORDER BY created_at ASC LIMIT 200').all(req.user.id);
  res.json({ history: rows });
});

module.exports = router;
