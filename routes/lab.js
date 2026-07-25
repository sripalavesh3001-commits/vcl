const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const elements = require('../data/elements.json');
const reagents = require('../data/reagents.json');

const router = express.Router();

router.get('/inventory', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM lab_inventory WHERE user_id = ? ORDER BY added_at DESC').all(req.user.id);
  res.json({ inventory: rows });
});

// Add an element (by symbol) or reagent (by formula) to the user's lab inventory
router.post('/inventory', requireAuth, (req, res) => {
  const { formula, quantity, unit, purity, concentration, sourceType } = req.body;
  if (!formula) return res.status(400).json({ error: 'A chemical formula or element symbol is required.' });

  let displayName = formula;
  const el = elements.find(e => e.symbol.toLowerCase() === formula.toLowerCase());
  const rg = reagents.find(r => r.formula.toLowerCase() === formula.toLowerCase());
  if (el) displayName = `${el.name} (${el.symbol})`;
  else if (rg) displayName = rg.name;
  else return res.status(404).json({ error: `'${formula}' is not a recognized element or reagent.` });

  const info = db.prepare(`
    INSERT INTO lab_inventory (user_id, formula, display_name, quantity, unit, purity, concentration, source_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id, formula, displayName,
    quantity || 1, unit || (el ? 'g' : 'mL'),
    purity != null ? purity : 99.0,
    concentration || null,
    sourceType || (el ? 'element' : 'reagent')
  );

  awardBadgeIfFirst(req.user.id, 'first_chemical', 'First Chemical Added');
  const row = db.prepare('SELECT * FROM lab_inventory WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ item: row });
});

router.put('/inventory/:id', requireAuth, (req, res) => {
  const { quantity, unit, purity, concentration } = req.body;
  const existing = db.prepare('SELECT * FROM lab_inventory WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Inventory item not found.' });

  db.prepare(`
    UPDATE lab_inventory SET quantity = ?, unit = ?, purity = ?, concentration = ? WHERE id = ?
  `).run(
    quantity ?? existing.quantity,
    unit ?? existing.unit,
    purity ?? existing.purity,
    concentration ?? existing.concentration,
    req.params.id
  );
  res.json({ item: db.prepare('SELECT * FROM lab_inventory WHERE id = ?').get(req.params.id) });
});

router.delete('/inventory/:id', requireAuth, (req, res) => {
  const info = db.prepare('DELETE FROM lab_inventory WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Inventory item not found.' });
  res.json({ success: true });
});

// GET available lab apparatus (static catalog, used to render drag-and-drop bench)
router.get('/apparatus', (req, res) => {
  res.json({
    apparatus: [
      { key: 'beaker', name: 'Beaker', use: 'Mixing and heating liquids' },
      { key: 'test-tube', name: 'Test Tube', use: 'Small-scale reactions and tests' },
      { key: 'flask', name: 'Round-Bottom Flask', use: 'Heating and reflux reactions' },
      { key: 'conical-flask', name: 'Conical (Erlenmeyer) Flask', use: 'Titrations and swirling mixtures' },
      { key: 'volumetric-flask', name: 'Volumetric Flask', use: 'Preparing solutions of precise concentration' },
      { key: 'burette', name: 'Burette', use: 'Precise dispensing of titrant' },
      { key: 'pipette', name: 'Pipette', use: 'Accurate transfer of a fixed volume' },
      { key: 'measuring-cylinder', name: 'Measuring Cylinder', use: 'Approximate volume measurement' },
      { key: 'funnel', name: 'Funnel', use: 'Filtration and transferring liquids' },
      { key: 'crucible', name: 'Crucible', use: 'High-temperature heating of solids' },
      { key: 'watch-glass', name: 'Watch Glass', use: 'Evaporation and holding solids' },
      { key: 'glass-rod', name: 'Glass Stirring Rod', use: 'Stirring and guiding liquid transfer' },
      { key: 'thermometer', name: 'Thermometer', use: 'Measuring temperature' },
      { key: 'digital-balance', name: 'Digital Balance', use: 'Precise mass measurement' },
      { key: 'ph-meter', name: 'pH Meter', use: 'Measuring solution acidity/basicity' },
      { key: 'magnetic-stirrer', name: 'Magnetic Stirrer', use: 'Continuous automated stirring' },
      { key: 'hot-plate', name: 'Hot Plate', use: 'Controlled heating' },
      { key: 'water-bath', name: 'Water Bath', use: 'Gentle, even heating' },
      { key: 'ice-bath', name: 'Ice Bath', use: 'Cooling reactions' },
      { key: 'bunsen-burner', name: 'Bunsen Burner', use: 'Direct flame heating' },
      { key: 'fume-hood', name: 'Fume Hood', use: 'Safely venting hazardous fumes' }
    ]
  });
});

// GET available reagent catalog (common lab compounds, separate from pure elements)
router.get('/reagents', (req, res) => {
  res.json({ reagents });
});

function awardBadgeIfFirst(userId, key, name) {
  try {
    db.prepare('INSERT OR IGNORE INTO badges (user_id, badge_key, badge_name) VALUES (?, ?, ?)').run(userId, key, name);
  } catch (e) { /* ignore */ }
}

module.exports = router;
