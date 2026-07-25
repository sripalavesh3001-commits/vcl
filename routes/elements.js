const express = require('express');
const elements = require('../data/elements.json');

const router = express.Router();

// GET /api/elements  -> full list, optional query filters
router.get('/', (req, res) => {
  let results = elements;
  const { search, group, period, category, block } = req.query;

  if (search) {
    const q = search.toLowerCase();
    results = results.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.symbol.toLowerCase() === q ||
      String(e.atomicNumber) === q
    );
  }
  if (group) results = results.filter(e => String(e.group) === String(group));
  if (period) results = results.filter(e => String(e.period) === String(period));
  if (category) results = results.filter(e => e.category === category);
  if (block) results = results.filter(e => e.block === block);

  res.json({ count: results.length, elements: results });
});

// GET /api/elements/categories -> list of distinct categories for filter UI
router.get('/categories', (req, res) => {
  const cats = [...new Map(elements.map(e => [e.category, e.categoryLabel])).entries()]
    .map(([category, label]) => ({ category, label }));
  res.json({ categories: cats });
});

// GET /api/elements/:symbolOrNumber
router.get('/:id', (req, res) => {
  const id = req.params.id;
  const el = elements.find(
    e => e.symbol.toLowerCase() === id.toLowerCase() || String(e.atomicNumber) === id
  );
  if (!el) return res.status(404).json({ error: `Element '${id}' not found.` });
  res.json({ element: el });
});

module.exports = router;
