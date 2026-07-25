const express = require('express');
const elements = require('../data/elements.json');

const router = express.Router();

const massBySymbol = new Map(elements.map(e => [e.symbol, e.atomicMass]));

// Parses a simple chemical formula like "H2SO4" or "Ca(OH)2" into element counts
function parseFormula(formula) {
  const stack = [{}];
  let i = 0;
  while (i < formula.length) {
    const ch = formula[i];
    if (ch === '(' || ch === '[') {
      stack.push({});
      i++;
    } else if (ch === ')' || ch === ']') {
      i++;
      let numStr = '';
      while (i < formula.length && /[0-9]/.test(formula[i])) { numStr += formula[i]; i++; }
      const mult = numStr ? parseInt(numStr, 10) : 1;
      const group = stack.pop();
      const top = stack[stack.length - 1];
      for (const [el, count] of Object.entries(group)) {
        top[el] = (top[el] || 0) + count * mult;
      }
    } else if (/[A-Z]/.test(ch)) {
      let sym = ch;
      i++;
      if (i < formula.length && /[a-z]/.test(formula[i])) { sym += formula[i]; i++; }
      let numStr = '';
      while (i < formula.length && /[0-9]/.test(formula[i])) { numStr += formula[i]; i++; }
      const count = numStr ? parseInt(numStr, 10) : 1;
      const top = stack[stack.length - 1];
      top[sym] = (top[sym] || 0) + count;
    } else {
      i++; // skip unrecognized chars (spaces, dots)
    }
  }
  return stack[0];
}

function molecularWeight(formula) {
  const counts = parseFormula(formula);
  let total = 0;
  const breakdown = [];
  for (const [sym, count] of Object.entries(counts)) {
    const mass = massBySymbol.get(sym);
    if (mass == null) throw new Error(`Unknown element symbol '${sym}' in formula.`);
    total += mass * count;
    breakdown.push({ symbol: sym, count, atomicMass: mass, subtotal: +(mass * count).toFixed(4) });
  }
  return { formula, molecularWeight: +total.toFixed(4), breakdown };
}

router.post('/molecular-weight', (req, res) => {
  try {
    const { formula } = req.body;
    if (!formula) return res.status(400).json({ error: 'A chemical formula is required, e.g. "H2SO4".' });
    res.json(molecularWeight(formula));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/empirical-formula', (req, res) => {
  // masses: { "C": 40.0, "H": 6.7, "O": 53.3 } (percent by mass)
  const { massPercent } = req.body;
  if (!massPercent || typeof massPercent !== 'object') {
    return res.status(400).json({ error: 'Provide massPercent as an object, e.g. { "C": 40.0, "H": 6.7, "O": 53.3 }' });
  }
  try {
    const moles = {};
    for (const [sym, pct] of Object.entries(massPercent)) {
      const mass = massBySymbol.get(sym);
      if (mass == null) throw new Error(`Unknown element symbol '${sym}'.`);
      moles[sym] = pct / mass;
    }
    const minMoles = Math.min(...Object.values(moles));
    const ratios = {};
    for (const [sym, m] of Object.entries(moles)) ratios[sym] = +(m / minMoles).toFixed(2);
    const formulaStr = Object.entries(ratios).map(([s, r]) => `${s}${Math.round(r) !== 1 ? Math.round(r) : ''}`).join('');
    res.json({ moles, ratios, empiricalFormula: formulaStr });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/molarity', (req, res) => {
  const { moles, massGrams, formula, volumeLiters } = req.body;
  if (!volumeLiters || volumeLiters <= 0) return res.status(400).json({ error: 'volumeLiters must be a positive number.' });
  try {
    let n = moles;
    if (n == null) {
      if (massGrams == null || !formula) return res.status(400).json({ error: 'Provide either moles, or massGrams + formula.' });
      const { molecularWeight: mw } = molecularWeight(formula);
      n = massGrams / mw;
    }
    const molarity = n / volumeLiters;
    res.json({ moles: +n.toFixed(6), volumeLiters, molarity: +molarity.toFixed(6), unit: 'mol/L' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/molality', (req, res) => {
  const { moles, massGrams, formula, solventKg } = req.body;
  if (!solventKg || solventKg <= 0) return res.status(400).json({ error: 'solventKg must be a positive number.' });
  try {
    let n = moles;
    if (n == null) {
      if (massGrams == null || !formula) return res.status(400).json({ error: 'Provide either moles, or massGrams + formula.' });
      const { molecularWeight: mw } = molecularWeight(formula);
      n = massGrams / mw;
    }
    const molality = n / solventKg;
    res.json({ moles: +n.toFixed(6), solventKg, molality: +molality.toFixed(6), unit: 'mol/kg' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/normality', (req, res) => {
  const { molarity, equivalents } = req.body;
  if (molarity == null || equivalents == null) return res.status(400).json({ error: 'Provide molarity and equivalents (n-factor).' });
  res.json({ normality: +(molarity * equivalents).toFixed(6), unit: 'eq/L' });
});

router.post('/dilution', (req, res) => {
  // C1V1 = C2V2, solve for missing value
  const { c1, v1, c2, v2 } = req.body;
  const vals = { c1, v1, c2, v2 };
  const missing = Object.entries(vals).filter(([, v]) => v == null || v === '');
  if (missing.length !== 1) return res.status(400).json({ error: 'Provide exactly 3 of the 4 values (c1, v1, c2, v2); the 4th will be solved for.' });
  const [missingKey] = missing[0];
  let result;
  if (missingKey === 'c1') result = (c2 * v2) / v1;
  else if (missingKey === 'v1') result = (c2 * v2) / c1;
  else if (missingKey === 'c2') result = (c1 * v1) / v2;
  else result = (c1 * v1) / c2;
  res.json({ ...vals, [missingKey]: +result.toFixed(6), formula: 'C1V1 = C2V2' });
});

router.post('/ph', (req, res) => {
  const { hConcentration, pH, pOH, ohConcentration } = req.body;
  if (hConcentration != null) {
    const ph = -Math.log10(hConcentration);
    return res.json({ pH: +ph.toFixed(3), pOH: +(14 - ph).toFixed(3), classification: classifyPh(ph) });
  }
  if (pH != null) {
    const h = Math.pow(10, -pH);
    return res.json({ hConcentration: h, pOH: +(14 - pH).toFixed(3), classification: classifyPh(pH) });
  }
  if (ohConcentration != null) {
    const pOHv = -Math.log10(ohConcentration);
    const phv = 14 - pOHv;
    return res.json({ pH: +phv.toFixed(3), pOH: +pOHv.toFixed(3), classification: classifyPh(phv) });
  }
  if (pOH != null) {
    const phv = 14 - pOH;
    return res.json({ pH: +phv.toFixed(3), hConcentration: Math.pow(10, -phv), classification: classifyPh(phv) });
  }
  res.status(400).json({ error: 'Provide one of: hConcentration, pH, pOH, ohConcentration.' });
});

function classifyPh(ph) {
  if (ph < 7) return 'Acidic';
  if (ph > 7) return 'Basic';
  return 'Neutral';
}

router.post('/buffer', (req, res) => {
  // Henderson-Hasselbalch: pH = pKa + log10([A-]/[HA])
  const { pKa, baseConcentration, acidConcentration } = req.body;
  if (pKa == null || baseConcentration == null || acidConcentration == null) {
    return res.status(400).json({ error: 'Provide pKa, baseConcentration ([A-]), and acidConcentration ([HA]).' });
  }
  const ph = pKa + Math.log10(baseConcentration / acidConcentration);
  res.json({ pH: +ph.toFixed(3), formula: 'pH = pKa + log10([A-]/[HA])' });
});

router.post('/gas-laws/boyle', (req, res) => {
  const { p1, v1, p2, v2 } = req.body;
  if (p1 != null && v1 != null && p2 != null) return res.json({ v2: +((p1 * v1) / p2).toFixed(6), formula: 'P1V1 = P2V2' });
  if (p1 != null && v1 != null && v2 != null) return res.json({ p2: +((p1 * v1) / v2).toFixed(6), formula: 'P1V1 = P2V2' });
  res.status(400).json({ error: 'Provide p1, v1, and either p2 or v2.' });
});

router.post('/gas-laws/charles', (req, res) => {
  const { v1, t1, v2, t2 } = req.body;
  if (v1 != null && t1 != null && t2 != null) return res.json({ v2: +((v1 * t2) / t1).toFixed(6), formula: 'V1/T1 = V2/T2 (T in Kelvin)' });
  if (v1 != null && t1 != null && v2 != null) return res.json({ t2: +((v2 * t1) / v1).toFixed(6), formula: 'V1/T1 = V2/T2 (T in Kelvin)' });
  res.status(400).json({ error: 'Provide v1, t1, and either v2 or t2 (temperatures in Kelvin).' });
});

router.post('/gas-laws/combined', (req, res) => {
  const { p1, v1, t1, p2, v2, t2 } = req.body;
  const known = { p1, v1, t1, p2, v2, t2 };
  const missing = Object.entries(known).filter(([, v]) => v == null);
  if (missing.length !== 1) return res.status(400).json({ error: 'Provide exactly 5 of the 6 values (p1,v1,t1,p2,v2,t2); the 6th is solved for.' });
  const [key] = missing[0];
  let result;
  if (key === 'p2') result = (p1 * v1 * t2) / (t1 * v2);
  else if (key === 'v2') result = (p1 * v1 * t2) / (t1 * p2);
  else if (key === 't2') result = (p2 * v2 * t1) / (p1 * v1);
  else if (key === 'p1') result = (p2 * v2 * t1) / (t2 * v1);
  else if (key === 'v1') result = (p2 * v2 * t1) / (t2 * p1);
  else result = (p1 * v1 * t2) / (p2 * v2);
  res.json({ ...known, [key]: +result.toFixed(6), formula: 'P1V1/T1 = P2V2/T2' });
});

router.post('/gas-laws/ideal', (req, res) => {
  // PV = nRT, R = 0.0821 L.atm/(mol.K)
  const R = 0.0821;
  const { p, v, n, t } = req.body;
  const known = { p, v, n, t };
  const missing = Object.entries(known).filter(([, val]) => val == null);
  if (missing.length !== 1) return res.status(400).json({ error: 'Provide exactly 3 of the 4 values (p in atm, v in L, n in mol, t in K); the 4th is solved for.' });
  const [key] = missing[0];
  let result;
  if (key === 'p') result = (n * R * t) / v;
  else if (key === 'v') result = (n * R * t) / p;
  else if (key === 'n') result = (p * v) / (R * t);
  else result = (p * v) / (n * R);
  res.json({ ...known, [key]: +result.toFixed(6), R, formula: 'PV = nRT' });
});

router.post('/density', (req, res) => {
  const { mass, volume, density } = req.body;
  if (mass != null && volume != null) return res.json({ density: +(mass / volume).toFixed(6), unit: 'g/mL' });
  if (mass != null && density != null) return res.json({ volume: +(mass / density).toFixed(6), unit: 'mL' });
  if (volume != null && density != null) return res.json({ mass: +(volume * density).toFixed(6), unit: 'g' });
  res.status(400).json({ error: 'Provide exactly two of: mass, volume, density.' });
});

router.post('/limiting-reagent', (req, res) => {
  // reactants: [{formula, massGrams, coefficient}]
  const { reactants } = req.body;
  if (!Array.isArray(reactants) || reactants.length < 2) {
    return res.status(400).json({ error: 'Provide at least 2 reactants: [{ formula, massGrams, coefficient }]' });
  }
  try {
    const analysis = reactants.map(r => {
      const { molecularWeight: mw } = molecularWeight(r.formula);
      const moles = r.massGrams / mw;
      const molesPerCoefficient = moles / (r.coefficient || 1);
      return { ...r, molecularWeight: mw, moles: +moles.toFixed(6), molesPerCoefficient: +molesPerCoefficient.toFixed(6) };
    });
    const limiting = analysis.reduce((min, r) => (r.molesPerCoefficient < min.molesPerCoefficient ? r : min));
    res.json({ analysis, limitingReagent: limiting.formula });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/percent-yield', (req, res) => {
  const { actualYield, theoreticalYield } = req.body;
  if (actualYield == null || theoreticalYield == null || theoreticalYield <= 0) {
    return res.status(400).json({ error: 'Provide actualYield and a positive theoreticalYield.' });
  }
  res.json({ percentYield: +((actualYield / theoreticalYield) * 100).toFixed(3), unit: '%' });
});

router.post('/stoichiometry', (req, res) => {
  // Simple mole-to-mole/mass conversion given a balanced ratio
  const { givenFormula, givenMassGrams, givenCoefficient, targetFormula, targetCoefficient } = req.body;
  if (!givenFormula || givenMassGrams == null || !targetFormula) {
    return res.status(400).json({ error: 'Provide givenFormula, givenMassGrams, targetFormula (and optional coefficients, default 1).' });
  }
  try {
    const gc = givenCoefficient || 1;
    const tc = targetCoefficient || 1;
    const { molecularWeight: givenMW } = molecularWeight(givenFormula);
    const { molecularWeight: targetMW } = molecularWeight(targetFormula);
    const givenMoles = givenMassGrams / givenMW;
    const targetMoles = (givenMoles / gc) * tc;
    const targetMass = targetMoles * targetMW;
    res.json({
      givenMoles: +givenMoles.toFixed(6),
      targetMoles: +targetMoles.toFixed(6),
      targetMassGrams: +targetMass.toFixed(6)
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
