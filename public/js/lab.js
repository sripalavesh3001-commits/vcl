const Lab = {
  apparatus: [],
  reagents: [],
  inventory: [],
  selectedChemicals: [],

  async load() {
    const [{ apparatus }, { reagents }] = await Promise.all([
      API.get('/lab/apparatus'),
      API.get('/lab/reagents')
    ]);
    this.apparatus = apparatus;
    this.reagents = reagents;
    await this.loadInventory();
  },

  async loadInventory() {
    try {
      const { inventory } = await API.get('/lab/inventory');
      this.inventory = inventory;
    } catch (e) { this.inventory = []; }
  },

  groupedReagentOptions() {
    const groups = {};
    for (const r of this.reagents) {
      const key = r.class || 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }
    const labelFor = { acid: 'Acids', base: 'Bases', salt: 'Salts', oxidizer: 'Oxidizers', metal: 'Metals',
      fuel: 'Fuels & Gases', solvent: 'Solvents', oxide: 'Oxides', halogen: 'Halogens', organic: 'Organic Compounds', other: 'Other' };
    return Object.entries(groups).map(([key, items]) => `
      <optgroup label="${labelFor[key] || key}">
        ${items.map(r => `<option value="${r.formula}">${escapeHtml(r.name)} (${r.formula})</option>`).join('')}
      </optgroup>
    `).join('');
  },

  async render(container) {
    await this.load();
    container.innerHTML = `
      <div class="view-header">
        <h1>Virtual Laboratory</h1>
        <p>Drag apparatus onto the bench, stock your inventory with elements and reagents, then mix chemicals to trigger the reaction engine.</p>
      </div>

      <div class="bench-layout">
        <div class="flex" style="flex-direction:column; gap:18px;">
          <div class="card">
            <div class="flex-between mb-12">
              <strong>Lab Bench</strong>
              <button class="btn btn-ghost btn-sm" id="clear-bench">Clear Bench</button>
            </div>
            <div class="bench-drop-zone" id="bench-drop-zone">
              <span class="text-dim small">Drag apparatus here from the shelf below ↓</span>
            </div>
            <div class="exp-section-title mt-20">Apparatus Shelf</div>
            <div class="apparatus-shelf" id="apparatus-shelf"></div>
          </div>

          <div class="card">
            <strong>Reaction Mixer</strong>
            <p class="small text-mid">Select 2 or more chemicals from your inventory below, then mix them to see what happens.</p>
            <div class="flex" style="flex-wrap:wrap; gap:8px;" id="mixer-chips"></div>
            <button class="btn btn-primary mt-12" id="mix-btn">⚗ Mix Selected Chemicals</button>
            <div id="reaction-output"></div>
          </div>
        </div>

        <div class="flex" style="flex-direction:column; gap:18px;">
          <div class="card">
            <strong>Add Reagent to Inventory</strong>
            <select class="input mt-12" id="reagent-select">
              ${this.groupedReagentOptions()}
            </select>
            <button class="btn btn-secondary mt-12" style="width:100%;" id="add-reagent-btn">+ Add to Inventory</button>
          </div>

          <div class="card">
            <div class="flex-between mb-12"><strong>Inventory</strong><span class="badge" id="inv-count">${this.inventory.length}</span></div>
            <div class="inventory-list" id="inventory-list"></div>
          </div>
        </div>
      </div>
    `;

    this.renderApparatusShelf(container);
    this.renderInventory(container);
    this.bindBench(container);

    container.querySelector('#add-reagent-btn').addEventListener('click', async () => {
      const formula = container.querySelector('#reagent-select').value;
      try {
        await API.post('/lab/inventory', { formula, quantity: 25, unit: 'mL', sourceType: 'reagent' });
        showToast(`Added ${formula} to inventory.`);
        await this.loadInventory();
        this.renderInventory(container);
      } catch (err) { showToast(err.message, 'error'); }
    });

    container.querySelector('#mix-btn').addEventListener('click', () => this.performMix(container));
  },

  renderApparatusShelf(container) {
    const shelf = container.querySelector('#apparatus-shelf');
    shelf.innerHTML = this.apparatus.map(a => `
      <div class="apparatus-tile" draggable="true" data-key="${a.key}" data-name="${escapeHtml(a.name)}" title="${escapeHtml(a.use)}">
        <span class="a-icon">⚗</span>${a.name}
      </div>
    `).join('');
    shelf.querySelectorAll('.apparatus-tile').forEach(tile => {
      tile.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ key: tile.dataset.key, name: tile.dataset.name }));
      });
    });
  },

  bindBench(container) {
    const zone = container.querySelector('#bench-drop-zone');
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (zone.querySelector('.text-dim')) zone.innerHTML = '';
      const item = document.createElement('div');
      item.className = 'bench-item';
      item.innerHTML = `<span>⚗</span> ${escapeHtml(data.name)} <button class="btn btn-ghost btn-sm" style="padding:2px 8px;">✕</button>`;
      item.querySelector('button').addEventListener('click', () => item.remove());
      zone.appendChild(item);
    });
    container.querySelector('#clear-bench').addEventListener('click', () => {
      zone.innerHTML = `<span class="text-dim small">Drag apparatus here from the shelf below ↓</span>`;
    });
  },

  renderInventory(container) {
    const list = container.querySelector('#inventory-list');
    container.querySelector('#inv-count').textContent = this.inventory.length;
    if (!this.inventory.length) {
      list.innerHTML = `<p class="small text-dim">No chemicals yet. Add elements from the Periodic Table or reagents above.</p>`;
    } else {
      list.innerHTML = this.inventory.map(item => `
        <div class="inventory-row">
          <span>${escapeHtml(item.display_name)}</span>
          <span class="flex gap-8" style="align-items:center;">
            <span class="mono small text-mid">${item.quantity}${item.unit}</span>
            <button class="btn btn-ghost btn-sm" data-remove="${item.id}">✕</button>
          </span>
        </div>
      `).join('');
      list.querySelectorAll('[data-remove]').forEach(btn => {
        btn.addEventListener('click', async () => {
          await API.del(`/lab/inventory/${btn.dataset.remove}`);
          await this.loadInventory();
          this.renderInventory(container);
          this.renderMixerChips(container);
        });
      });
    }
    this.renderMixerChips(container);
  },

  renderMixerChips(container) {
    const chips = container.querySelector('#mixer-chips');
    if (!chips) return;
    if (!this.inventory.length) {
      chips.innerHTML = `<span class="small text-dim">Add chemicals to your inventory to mix them.</span>`;
      return;
    }
    chips.innerHTML = this.inventory.map(item => `
      <button class="chem-select-chip ${this.selectedChemicals.includes(item.formula) ? 'selected' : ''}" data-formula="${item.formula}">
        ${item.formula}
      </button>
    `).join('');
    chips.querySelectorAll('.chem-select-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const f = chip.dataset.formula;
        if (this.selectedChemicals.includes(f)) {
          this.selectedChemicals = this.selectedChemicals.filter(x => x !== f);
        } else {
          this.selectedChemicals.push(f);
        }
        this.renderMixerChips(container);
      });
    });
  },

  async performMix(container) {
    const output = container.querySelector('#reaction-output');
    if (this.selectedChemicals.length < 2) {
      showToast('Select at least 2 chemicals to mix.', 'error');
      return;
    }
    output.innerHTML = `<p class="small text-dim mt-12">Mixing...</p>`;
    try {
      const result = await API.post('/reactions/mix', { chemicals: this.selectedChemicals });
      this.renderReactionResult(output, result);
      await this.loadInventory();
    } catch (err) {
      output.innerHTML = `<div class="reaction-result no-reaction"><p>${escapeHtml(err.message)}</p></div>`;
    }
  },

  renderReactionResult(output, result) {
    if (!result.reacted) {
      output.innerHTML = `
        <div class="reaction-result no-reaction">
          <strong>No Reaction Occurs</strong>
          <p class="small text-mid mt-12">${escapeHtml(result.message)}</p>
        </div>
      `;
      return;
    }
    const r = result.reaction;
    output.innerHTML = `
      <div class="reaction-result">
        <span class="badge">${escapeHtml(r.type)}</span>
        <div class="equation-display">${escapeHtml(r.equation)}</div>
        ${this.flaskAnimation(r.animation)}
        <table class="prop-table">
          <tr><td>Observation</td><td style="text-align:left; font-family:var(--font-body);">${escapeHtml(r.observation)}</td></tr>
          <tr><td>Catalyst</td><td>${r.catalyst ? escapeHtml(r.catalyst) : 'None'}</td></tr>
          <tr><td>Conditions</td><td style="text-align:left; font-family:var(--font-body);">${escapeHtml(r.conditions)}</td></tr>
          <tr><td>Reaction Rate</td><td style="text-align:left; font-family:var(--font-body);">${escapeHtml(r.reactionRate)}</td></tr>
          <tr><td>Activation Energy</td><td style="text-align:left; font-family:var(--font-body);">${escapeHtml(r.activationEnergy)}</td></tr>
          <tr><td>Enthalpy Change</td><td>${r.enthalpyChange} kJ/mol</td></tr>
          <tr><td>Thermicity</td><td>${escapeHtml(r.thermicity)}</td></tr>
        </table>
        <div class="exp-section-title">Mechanism</div>
        <p class="small text-mid">${escapeHtml(r.mechanism)}</p>
        <div class="exp-section-title">Industrial Applications</div>
        <p class="small text-mid">${escapeHtml(r.industrialApplications)}</p>
        <div class="exp-section-title">Safety & Waste Disposal</div>
        <p class="small text-mid">⚠ ${escapeHtml(r.safety)}<br>${escapeHtml(r.wasteDisposal)}</p>
      </div>
    `;
  },

  flaskAnimation(animTypes = []) {
    const hasGas = animTypes.includes('bubble-animation') || animTypes.includes('gas-evolution');
    const hasFlame = animTypes.includes('flame') || animTypes.includes('sparks');
    const color = animTypes.includes('color-change') ? 'var(--teal)' : (animTypes.includes('precipitate-formation') ? '#EAF0FA' : 'var(--flame-dim)');
    return `
      <div class="flask-anim-wrap">
        <svg class="flask-svg" viewBox="0 0 90 110">
          <path d="M35 10 H55 V35 L75 90 Q78 100 65 100 H25 Q12 100 15 90 L35 35 Z" fill="none" stroke="var(--panel-line)" stroke-width="2"/>
          <path d="M20 88 Q45 95 70 88 L65 98 Q45 102 25 98 Z" fill="${color}" opacity="0.85"/>
          ${hasFlame ? `<circle cx="45" cy="20" r="6" fill="var(--flame)" opacity="0.8"><animate attributeName="r" values="5;8;5" dur="0.8s" repeatCount="indefinite"/></circle>` : ''}
          ${hasGas ? Array.from({length:5}).map((_,i) => `<circle class="bubble" cx="${30+i*8}" cy="90" r="3" fill="#ffffff77" style="animation-delay:${i*0.3}s"/>`).join('') : ''}
        </svg>
      </div>
    `;
  }
};
