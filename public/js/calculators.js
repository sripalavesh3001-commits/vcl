const Calculators = {
  active: 'molecular-weight',

  tabs: [
    { key: 'molecular-weight', label: 'Molecular Weight' },
    { key: 'molarity', label: 'Molarity' },
    { key: 'molality', label: 'Molality' },
    { key: 'normality', label: 'Normality' },
    { key: 'dilution', label: 'Dilution (C1V1=C2V2)' },
    { key: 'ph', label: 'pH / pOH' },
    { key: 'buffer', label: 'Buffer (Henderson-Hasselbalch)' },
    { key: 'gas-boyle', label: "Boyle's Law" },
    { key: 'gas-charles', label: "Charles's Law" },
    { key: 'gas-combined', label: 'Combined Gas Law' },
    { key: 'gas-ideal', label: 'Ideal Gas Law' },
    { key: 'density', label: 'Density' },
    { key: 'limiting-reagent', label: 'Limiting Reagent' },
    { key: 'percent-yield', label: 'Percent Yield' },
    { key: 'empirical-formula', label: 'Empirical Formula' },
    { key: 'stoichiometry', label: 'Stoichiometry Converter' }
  ],

  async render(container) {
    container.innerHTML = `
      <div class="view-header">
        <h1>Chemistry Calculators</h1>
        <p>Real, formula-driven calculators — enter your values and get an instant, worked result.</p>
      </div>
      <div class="calc-tabs" id="calc-tabs">
        ${this.tabs.map(t => `<button class="calc-tab ${t.key === this.active ? 'active' : ''}" data-tab="${t.key}">${t.label}</button>`).join('')}
      </div>
      <div class="card" id="calc-body" style="max-width:640px;"></div>
    `;
    container.querySelectorAll('.calc-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.active = tab.dataset.tab;
        container.querySelectorAll('.calc-tab').forEach(t => t.classList.toggle('active', t === tab));
        this.renderForm(container);
      });
    });
    this.renderForm(container);
  },

  renderForm(container) {
    const body = container.querySelector('#calc-body');
    const forms = {
      'molecular-weight': `
        <div class="field"><label class="field-label">Chemical Formula</label><input class="input" id="c-formula" placeholder="e.g. H2SO4, Ca(OH)2"></div>
        <button class="btn btn-primary" id="c-run">Calculate</button>`,
      'molarity': `
        <div class="field"><label class="field-label">Mass (g) — optional if moles given</label><input class="input" id="c-mass" type="number" step="any"></div>
        <div class="field"><label class="field-label">Formula — required with mass</label><input class="input" id="c-formula" placeholder="e.g. NaCl"></div>
        <div class="field"><label class="field-label">Moles — optional if mass given</label><input class="input" id="c-moles" type="number" step="any"></div>
        <div class="field"><label class="field-label">Volume (L)</label><input class="input" id="c-volume" type="number" step="any"></div>
        <button class="btn btn-primary" id="c-run">Calculate Molarity</button>`,
      'molality': `
        <div class="field"><label class="field-label">Mass (g) — optional if moles given</label><input class="input" id="c-mass" type="number" step="any"></div>
        <div class="field"><label class="field-label">Formula — required with mass</label><input class="input" id="c-formula"></div>
        <div class="field"><label class="field-label">Moles — optional if mass given</label><input class="input" id="c-moles" type="number" step="any"></div>
        <div class="field"><label class="field-label">Solvent Mass (kg)</label><input class="input" id="c-solventkg" type="number" step="any"></div>
        <button class="btn btn-primary" id="c-run">Calculate Molality</button>`,
      'normality': `
        <div class="field"><label class="field-label">Molarity (mol/L)</label><input class="input" id="c-molarity" type="number" step="any"></div>
        <div class="field"><label class="field-label">Equivalents (n-factor)</label><input class="input" id="c-equiv" type="number" step="any"></div>
        <button class="btn btn-primary" id="c-run">Calculate Normality</button>`,
      'dilution': `
        <p class="small text-mid">Leave exactly ONE field blank — it will be solved for.</p>
        <div class="grid grid-2">
          <div class="field"><label class="field-label">C1 (initial conc.)</label><input class="input" id="c-c1" type="number" step="any"></div>
          <div class="field"><label class="field-label">V1 (initial vol.)</label><input class="input" id="c-v1" type="number" step="any"></div>
          <div class="field"><label class="field-label">C2 (final conc.)</label><input class="input" id="c-c2" type="number" step="any"></div>
          <div class="field"><label class="field-label">V2 (final vol.)</label><input class="input" id="c-v2" type="number" step="any"></div>
        </div>
        <button class="btn btn-primary" id="c-run">Solve</button>`,
      'ph': `
        <p class="small text-mid">Fill in exactly one field.</p>
        <div class="field"><label class="field-label">[H+] concentration (mol/L)</label><input class="input" id="c-h" type="number" step="any"></div>
        <div class="field"><label class="field-label">pH</label><input class="input" id="c-ph" type="number" step="any"></div>
        <div class="field"><label class="field-label">pOH</label><input class="input" id="c-poh" type="number" step="any"></div>
        <div class="field"><label class="field-label">[OH-] concentration (mol/L)</label><input class="input" id="c-oh" type="number" step="any"></div>
        <button class="btn btn-primary" id="c-run">Calculate</button>`,
      'buffer': `
        <div class="field"><label class="field-label">pKa of the weak acid</label><input class="input" id="c-pka" type="number" step="any"></div>
        <div class="field"><label class="field-label">[A-] Conjugate base concentration</label><input class="input" id="c-base" type="number" step="any"></div>
        <div class="field"><label class="field-label">[HA] Weak acid concentration</label><input class="input" id="c-acid" type="number" step="any"></div>
        <button class="btn btn-primary" id="c-run">Calculate Buffer pH</button>`,
      'gas-boyle': `
        <div class="grid grid-2">
          <div class="field"><label class="field-label">P1</label><input class="input" id="c-p1" type="number" step="any"></div>
          <div class="field"><label class="field-label">V1</label><input class="input" id="c-v1" type="number" step="any"></div>
          <div class="field"><label class="field-label">P2 (leave blank to solve)</label><input class="input" id="c-p2" type="number" step="any"></div>
          <div class="field"><label class="field-label">V2 (leave blank to solve)</label><input class="input" id="c-v2" type="number" step="any"></div>
        </div>
        <button class="btn btn-primary" id="c-run">Solve (P1V1=P2V2)</button>`,
      'gas-charles': `
        <p class="small text-mid">Temperatures must be in Kelvin.</p>
        <div class="grid grid-2">
          <div class="field"><label class="field-label">V1</label><input class="input" id="c-v1" type="number" step="any"></div>
          <div class="field"><label class="field-label">T1 (K)</label><input class="input" id="c-t1" type="number" step="any"></div>
          <div class="field"><label class="field-label">V2 (leave blank to solve)</label><input class="input" id="c-v2" type="number" step="any"></div>
          <div class="field"><label class="field-label">T2 (K, leave blank to solve)</label><input class="input" id="c-t2" type="number" step="any"></div>
        </div>
        <button class="btn btn-primary" id="c-run">Solve (V1/T1=V2/T2)</button>`,
      'gas-combined': `
        <p class="small text-mid">Fill in exactly 5 of 6 fields. Temperature in Kelvin.</p>
        <div class="grid grid-3">
          <div class="field"><label class="field-label">P1</label><input class="input" id="c-p1" type="number" step="any"></div>
          <div class="field"><label class="field-label">V1</label><input class="input" id="c-v1" type="number" step="any"></div>
          <div class="field"><label class="field-label">T1</label><input class="input" id="c-t1" type="number" step="any"></div>
          <div class="field"><label class="field-label">P2</label><input class="input" id="c-p2" type="number" step="any"></div>
          <div class="field"><label class="field-label">V2</label><input class="input" id="c-v2" type="number" step="any"></div>
          <div class="field"><label class="field-label">T2</label><input class="input" id="c-t2" type="number" step="any"></div>
        </div>
        <button class="btn btn-primary" id="c-run">Solve</button>`,
      'gas-ideal': `
        <p class="small text-mid">Fill in exactly 3 of 4. P in atm, V in L, n in mol, T in Kelvin. R = 0.0821.</p>
        <div class="grid grid-2">
          <div class="field"><label class="field-label">P (atm)</label><input class="input" id="c-p" type="number" step="any"></div>
          <div class="field"><label class="field-label">V (L)</label><input class="input" id="c-v" type="number" step="any"></div>
          <div class="field"><label class="field-label">n (mol)</label><input class="input" id="c-n" type="number" step="any"></div>
          <div class="field"><label class="field-label">T (K)</label><input class="input" id="c-t" type="number" step="any"></div>
        </div>
        <button class="btn btn-primary" id="c-run">Solve (PV=nRT)</button>`,
      'density': `
        <p class="small text-mid">Fill in exactly two fields.</p>
        <div class="field"><label class="field-label">Mass (g)</label><input class="input" id="c-mass" type="number" step="any"></div>
        <div class="field"><label class="field-label">Volume (mL)</label><input class="input" id="c-volume2" type="number" step="any"></div>
        <div class="field"><label class="field-label">Density (g/mL)</label><input class="input" id="c-density" type="number" step="any"></div>
        <button class="btn btn-primary" id="c-run">Calculate</button>`,
      'limiting-reagent': `
        <p class="small text-mid">Enter two reactants (formula, mass in grams, and balanced-equation coefficient).</p>
        <div class="grid grid-2">
          <div><div class="field"><label class="field-label">Reactant 1 Formula</label><input class="input" id="c-f1"></div>
          <div class="field"><label class="field-label">Mass (g)</label><input class="input" id="c-m1" type="number" step="any"></div>
          <div class="field"><label class="field-label">Coefficient</label><input class="input" id="c-co1" type="number" value="1"></div></div>
          <div><div class="field"><label class="field-label">Reactant 2 Formula</label><input class="input" id="c-f2"></div>
          <div class="field"><label class="field-label">Mass (g)</label><input class="input" id="c-m2" type="number" step="any"></div>
          <div class="field"><label class="field-label">Coefficient</label><input class="input" id="c-co2" type="number" value="1"></div></div>
        </div>
        <button class="btn btn-primary" id="c-run">Find Limiting Reagent</button>`,
      'percent-yield': `
        <div class="field"><label class="field-label">Actual Yield (g)</label><input class="input" id="c-actual" type="number" step="any"></div>
        <div class="field"><label class="field-label">Theoretical Yield (g)</label><input class="input" id="c-theoretical" type="number" step="any"></div>
        <button class="btn btn-primary" id="c-run">Calculate</button>`,
      'empirical-formula': `
        <p class="small text-mid">Enter mass percent for each element (comma separated, e.g. C:40.0, H:6.7, O:53.3)</p>
        <div class="field"><input class="input" id="c-masspercent" placeholder="C:40.0, H:6.7, O:53.3"></div>
        <button class="btn btn-primary" id="c-run">Calculate</button>`,
      'stoichiometry': `
        <div class="field"><label class="field-label">Given Formula</label><input class="input" id="c-given-formula"></div>
        <div class="field"><label class="field-label">Given Mass (g)</label><input class="input" id="c-given-mass" type="number" step="any"></div>
        <div class="field"><label class="field-label">Given Coefficient (balanced eqn)</label><input class="input" id="c-given-coeff" type="number" value="1"></div>
        <div class="field"><label class="field-label">Target Formula</label><input class="input" id="c-target-formula"></div>
        <div class="field"><label class="field-label">Target Coefficient (balanced eqn)</label><input class="input" id="c-target-coeff" type="number" value="1"></div>
        <button class="btn btn-primary" id="c-run">Convert</button>`
    };
    body.innerHTML = (forms[this.active] || '<p>Coming soon.</p>') + `<div id="calc-result-area"></div>`;
    const runBtn = body.querySelector('#c-run');
    if (runBtn) runBtn.addEventListener('click', () => this.runCalculation(body));
  },

  val(body, id) {
    const el = body.querySelector('#' + id);
    if (!el || el.value === '') return null;
    return parseFloat(el.value);
  },
  str(body, id) {
    const el = body.querySelector('#' + id);
    return el ? el.value.trim() : '';
  },

  async runCalculation(body) {
    const resultArea = body.querySelector('#calc-result-area');
    resultArea.innerHTML = `<div class="calc-result">Calculating...</div>`;
    try {
      let res;
      switch (this.active) {
        case 'molecular-weight':
          res = await API.post('/calculators/molecular-weight', { formula: this.str(body, 'c-formula') });
          resultArea.innerHTML = `<div class="calc-result">Molecular Weight of ${res.formula}: <strong>${res.molecularWeight} g/mol</strong><br>
            ${res.breakdown.map(b => `${b.symbol} × ${b.count} = ${b.subtotal}`).join('<br>')}</div>`;
          break;
        case 'molarity':
          res = await API.post('/calculators/molarity', { massGrams: this.val(body,'c-mass'), formula: this.str(body,'c-formula'), moles: this.val(body,'c-moles'), volumeLiters: this.val(body,'c-volume') });
          resultArea.innerHTML = `<div class="calc-result">Molarity = <strong>${res.molarity} mol/L</strong> (${res.moles} mol in ${res.volumeLiters} L)</div>`;
          break;
        case 'molality':
          res = await API.post('/calculators/molality', { massGrams: this.val(body,'c-mass'), formula: this.str(body,'c-formula'), moles: this.val(body,'c-moles'), solventKg: this.val(body,'c-solventkg') });
          resultArea.innerHTML = `<div class="calc-result">Molality = <strong>${res.molality} mol/kg</strong></div>`;
          break;
        case 'normality':
          res = await API.post('/calculators/normality', { molarity: this.val(body,'c-molarity'), equivalents: this.val(body,'c-equiv') });
          resultArea.innerHTML = `<div class="calc-result">Normality = <strong>${res.normality} eq/L</strong></div>`;
          break;
        case 'dilution':
          res = await API.post('/calculators/dilution', { c1: this.val(body,'c-c1'), v1: this.val(body,'c-v1'), c2: this.val(body,'c-c2'), v2: this.val(body,'c-v2') });
          resultArea.innerHTML = `<div class="calc-result">C1=${res.c1} V1=${res.v1} C2=${res.c2} V2=${res.v2} (solved using C1V1=C2V2)</div>`;
          break;
        case 'ph':
          res = await API.post('/calculators/ph', { hConcentration: this.val(body,'c-h'), pH: this.val(body,'c-ph'), pOH: this.val(body,'c-poh'), ohConcentration: this.val(body,'c-oh') });
          resultArea.innerHTML = `<div class="calc-result">pH = <strong>${res.pH ?? '—'}</strong> | pOH = ${res.pOH ?? '—'} ${res.classification ? `| ${res.classification}` : ''}</div>`;
          break;
        case 'buffer':
          res = await API.post('/calculators/buffer', { pKa: this.val(body,'c-pka'), baseConcentration: this.val(body,'c-base'), acidConcentration: this.val(body,'c-acid') });
          resultArea.innerHTML = `<div class="calc-result">Buffer pH = <strong>${res.pH}</strong></div>`;
          break;
        case 'gas-boyle':
          res = await API.post('/calculators/gas-laws/boyle', { p1: this.val(body,'c-p1'), v1: this.val(body,'c-v1'), p2: this.val(body,'c-p2'), v2: this.val(body,'c-v2') });
          resultArea.innerHTML = `<div class="calc-result">${JSON.stringify(res)}</div>`;
          break;
        case 'gas-charles':
          res = await API.post('/calculators/gas-laws/charles', { v1: this.val(body,'c-v1'), t1: this.val(body,'c-t1'), v2: this.val(body,'c-v2'), t2: this.val(body,'c-t2') });
          resultArea.innerHTML = `<div class="calc-result">${JSON.stringify(res)}</div>`;
          break;
        case 'gas-combined':
          res = await API.post('/calculators/gas-laws/combined', { p1: this.val(body,'c-p1'), v1: this.val(body,'c-v1'), t1: this.val(body,'c-t1'), p2: this.val(body,'c-p2'), v2: this.val(body,'c-v2'), t2: this.val(body,'c-t2') });
          resultArea.innerHTML = `<div class="calc-result">${JSON.stringify(res)}</div>`;
          break;
        case 'gas-ideal':
          res = await API.post('/calculators/gas-laws/ideal', { p: this.val(body,'c-p'), v: this.val(body,'c-v'), n: this.val(body,'c-n'), t: this.val(body,'c-t') });
          resultArea.innerHTML = `<div class="calc-result">${JSON.stringify(res)}</div>`;
          break;
        case 'density':
          res = await API.post('/calculators/density', { mass: this.val(body,'c-mass'), volume: this.val(body,'c-volume2'), density: this.val(body,'c-density') });
          resultArea.innerHTML = `<div class="calc-result">${JSON.stringify(res)}</div>`;
          break;
        case 'limiting-reagent':
          res = await API.post('/calculators/limiting-reagent', { reactants: [
            { formula: this.str(body,'c-f1'), massGrams: this.val(body,'c-m1'), coefficient: this.val(body,'c-co1') || 1 },
            { formula: this.str(body,'c-f2'), massGrams: this.val(body,'c-m2'), coefficient: this.val(body,'c-co2') || 1 }
          ]});
          resultArea.innerHTML = `<div class="calc-result">Limiting reagent: <strong>${res.limitingReagent}</strong><br>${res.analysis.map(a => `${a.formula}: ${a.moles} mol total, ${a.molesPerCoefficient} mol/coeff`).join('<br>')}</div>`;
          break;
        case 'percent-yield':
          res = await API.post('/calculators/percent-yield', { actualYield: this.val(body,'c-actual'), theoreticalYield: this.val(body,'c-theoretical') });
          resultArea.innerHTML = `<div class="calc-result">Percent Yield = <strong>${res.percentYield}%</strong></div>`;
          break;
        case 'empirical-formula': {
          const raw = this.str(body, 'c-masspercent');
          const massPercent = {};
          raw.split(',').forEach(pair => {
            const [sym, pct] = pair.split(':').map(s => s.trim());
            if (sym && pct) massPercent[sym] = parseFloat(pct);
          });
          res = await API.post('/calculators/empirical-formula', { massPercent });
          resultArea.innerHTML = `<div class="calc-result">Empirical Formula: <strong>${res.empiricalFormula}</strong><br>Ratios: ${JSON.stringify(res.ratios)}</div>`;
          break;
        }
        case 'stoichiometry':
          res = await API.post('/calculators/stoichiometry', {
            givenFormula: this.str(body,'c-given-formula'), givenMassGrams: this.val(body,'c-given-mass'), givenCoefficient: this.val(body,'c-given-coeff') || 1,
            targetFormula: this.str(body,'c-target-formula'), targetCoefficient: this.val(body,'c-target-coeff') || 1
          });
          resultArea.innerHTML = `<div class="calc-result">Target mass: <strong>${res.targetMassGrams} g</strong> (${res.targetMoles} mol)</div>`;
          break;
      }
    } catch (err) {
      resultArea.innerHTML = `<div class="calc-result" style="border-color:var(--danger); color:var(--danger);">${escapeHtml(err.message)}</div>`;
    }
  }
};
