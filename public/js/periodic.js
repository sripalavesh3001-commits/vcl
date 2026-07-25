const PeriodicTable = {
  elements: [],
  categories: [],
  filters: { search: '', category: '', group: '', period: '' },

  async load() {
    if (this.elements.length) return;
    const [{ elements }, { categories }] = await Promise.all([
      API.get('/elements'),
      API.get('/elements/categories')
    ]);
    this.elements = elements;
    this.categories = categories;
  },

  async render(container) {
    await this.load();
    container.innerHTML = `
      <div class="view-header">
        <h1>Interactive Periodic Table</h1>
        <p>All 118 elements. Click any vial to see full properties, or add it straight to your Virtual Lab inventory.</p>
      </div>
      <div class="pt-toolbar">
        <input class="input" id="pt-search" placeholder="Search by name, symbol, or atomic number..." value="${escapeHtml(this.filters.search)}">
        <select class="input" id="pt-category" style="max-width:220px;">
          <option value="">All categories</option>
          ${this.categories.map(c => `<option value="${c.category}">${c.label}</option>`).join('')}
        </select>
        <select class="input" id="pt-period" style="max-width:140px;">
          <option value="">All periods</option>
          ${[1,2,3,4,5,6,7].map(p => `<option value="${p}">Period ${p}</option>`).join('')}
        </select>
        <select class="input" id="pt-group" style="max-width:140px;">
          <option value="">All groups</option>
          ${Array.from({length:18},(_,i)=>i+1).map(g => `<option value="${g}">Group ${g}</option>`).join('')}
        </select>
      </div>
      <div class="legend" id="pt-legend"></div>
      <div class="card" style="overflow-x:auto;">
        <div class="periodic-grid" id="pt-grid"></div>
        <div class="f-block-row" id="pt-fblock"></div>
      </div>
    `;

    this.renderLegend();
    this.renderGrid();

    container.querySelector('#pt-search').addEventListener('input', (e) => { this.filters.search = e.target.value; this.renderGrid(); });
    container.querySelector('#pt-category').addEventListener('change', (e) => { this.filters.category = e.target.value; this.renderGrid(); });
    container.querySelector('#pt-period').addEventListener('change', (e) => { this.filters.period = e.target.value; this.renderGrid(); });
    container.querySelector('#pt-group').addEventListener('change', (e) => { this.filters.group = e.target.value; this.renderGrid(); });
  },

  renderLegend() {
    const legend = document.getElementById('pt-legend');
    legend.innerHTML = this.categories.map(c => `
      <div class="legend-chip"><span class="legend-swatch" style="background:var(--cat-${c.category})"></span>${c.label}</div>
    `).join('');
  },

  matches(el) {
    const f = this.filters;
    if (f.search) {
      const q = f.search.toLowerCase();
      if (!(el.name.toLowerCase().includes(q) || el.symbol.toLowerCase() === q || String(el.atomicNumber) === q)) return false;
    }
    if (f.category && el.category !== f.category) return false;
    if (f.period && String(el.period) !== f.period) return false;
    if (f.group && String(el.group) !== f.group) return false;
    return true;
  },

  renderGrid() {
    const grid = document.getElementById('pt-grid');
    const fblock = document.getElementById('pt-fblock');
    const cells = new Array(7 * 18).fill(null);
    const fRow1 = new Array(18).fill(null);
    const fRow2 = new Array(18).fill(null);

    for (const el of this.elements) {
      const visible = this.matches(el);
      if (el.atomicNumber >= 58 && el.atomicNumber <= 71) {
        fRow1[el.atomicNumber - 58 + 3] = { el, visible };
      } else if (el.atomicNumber >= 90 && el.atomicNumber <= 103) {
        fRow2[el.atomicNumber - 90 + 3] = { el, visible };
      } else {
        const idx = (el.period - 1) * 18 + (el.group - 1);
        cells[idx] = { el, visible };
      }
    }

    grid.innerHTML = cells.map(c => this.vialHtml(c)).join('');
    fblock.innerHTML = fRow1.map(c => this.vialHtml(c)).join('') + fRow2.map(c => this.vialHtml(c)).join('');

    grid.querySelectorAll('.vial[data-symbol]').forEach(v => v.addEventListener('click', () => this.openDetail(v.dataset.symbol)));
    fblock.querySelectorAll('.vial[data-symbol]').forEach(v => v.addEventListener('click', () => this.openDetail(v.dataset.symbol)));
  },

  vialHtml(c) {
    if (!c) return `<div class="vial placeholder"></div>`;
    const { el, visible } = c;
    const style = `--cap-color: var(--cat-${el.category});${visible ? '' : 'opacity:0.15;pointer-events:none;'}`;
    return `
      <div class="vial" data-symbol="${el.symbol}" style="${style}" title="${escapeHtml(el.name)}">
        <div class="vnum">${el.atomicNumber}</div>
        <div class="vsym">${el.symbol}</div>
        <div class="vname">${escapeHtml(el.name)}</div>
        <div class="vmass">${el.atomicMass}</div>
      </div>
    `;
  },

  async openDetail(symbol) {
    const { element: el } = await API.get(`/elements/${symbol}`);
    const backdrop = document.createElement('div');
    backdrop.className = 'drawer-backdrop';
    backdrop.innerHTML = `
      <div class="drawer">
        <button class="btn btn-ghost btn-sm" id="close-drawer">✕ Close</button>
        <div class="element-hero mt-20">
          <div class="big-vial" style="--cap-color: var(--cat-${el.category});">
            <div class="big-num">${el.atomicNumber}</div>
            <div class="big-sym">${el.symbol}</div>
          </div>
          <div>
            <h2 style="font-family:var(--font-display); margin:0 0 4px;">${escapeHtml(el.name)}</h2>
            <span class="badge" style="border-color:var(--cat-${el.category}); color:var(--cat-${el.category});">${el.categoryLabel}</span>
            <div class="small text-dim mt-12">Group ${el.group} · Period ${el.period} · ${el.block}-block</div>
          </div>
        </div>

        <div class="field">
          <label class="field-label">Add to Laboratory</label>
          <div class="flex gap-8">
            <input class="input" id="add-qty" type="number" min="0.01" step="0.01" value="10" style="max-width:100px;">
            <select class="input" id="add-unit" style="max-width:100px;">
              <option>g</option><option>mg</option><option>mol</option><option>mL</option>
            </select>
            <button class="btn btn-primary" id="add-to-lab-btn">+ Add</button>
          </div>
        </div>

        <table class="prop-table">
          <tr><td>Atomic Mass</td><td>${el.atomicMass} u</td></tr>
          <tr><td>Electron Configuration</td><td>${el.electronConfiguration}</td></tr>
          <tr><td>Valency</td><td>${el.valency}</td></tr>
          <tr><td>Oxidation States</td><td>${el.oxidationStates.join(', ') || '—'}</td></tr>
          <tr><td>Density</td><td>${el.density != null ? el.density + ' g/cm³' : 'Unknown'}</td></tr>
          <tr><td>Melting Point</td><td>${el.meltingPoint != null ? el.meltingPoint + ' K' : 'Unknown'}</td></tr>
          <tr><td>Boiling Point</td><td>${el.boilingPoint != null ? el.boilingPoint + ' K' : 'Unknown'}</td></tr>
          <tr><td>Electronegativity</td><td>${el.electronegativity != null ? el.electronegativity + ' (Pauling)' : 'N/A'}</td></tr>
          <tr><td>State at Room Temp</td><td>${el.stateAtRoomTemp}</td></tr>
          <tr><td>Discoverer</td><td>${el.discoverer}</td></tr>
          <tr><td>Discovery Year</td><td>${el.discoveryYear || 'Ancient / Unknown'}</td></tr>
        </table>

        <div class="mt-20">
          <div class="exp-section-title">Natural Occurrence & Uses</div>
          <p class="small text-mid">${escapeHtml(el.naturalOccurrence)}</p>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });
    backdrop.querySelector('#close-drawer').addEventListener('click', () => backdrop.remove());
    backdrop.querySelector('#add-to-lab-btn').addEventListener('click', async () => {
      const quantity = parseFloat(backdrop.querySelector('#add-qty').value) || 1;
      const unit = backdrop.querySelector('#add-unit').value;
      try {
        await API.post('/lab/inventory', { formula: el.symbol, quantity, unit, sourceType: 'element' });
        showToast(`${el.name} added to your Laboratory Inventory.`);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
};
