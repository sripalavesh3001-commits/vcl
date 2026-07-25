const Experiments = {
  list: [],

  async render(container) {
    const { experiments } = await API.get('/experiments');
    this.list = experiments;
    container.innerHTML = `
      <div class="view-header">
        <h1>Experiment Library</h1>
        <p>Full lab write-ups: theory, apparatus, procedure, calculations, viva questions, and MCQs.</p>
      </div>
      <div class="grid grid-3" id="exp-grid"></div>
    `;
    const grid = container.querySelector('#exp-grid');
    grid.innerHTML = this.list.map(e => `
      <div class="card exp-list-item" data-id="${e.id}">
        <span class="badge">${escapeHtml(e.category)}</span>
        <h3 style="font-family:var(--font-display); font-size:16px; margin:10px 0 6px;">${escapeHtml(e.title)}</h3>
        <p class="small text-mid">${escapeHtml(e.aim).slice(0, 110)}...</p>
      </div>
    `).join('');
    grid.querySelectorAll('.exp-list-item').forEach(card => {
      card.addEventListener('click', () => this.openDetail(card.dataset.id));
    });
  },

  async openDetail(id) {
    const { experiment: e, progress } = await API.get(`/experiments/${id}`);
    if (Auth.user) { try { await API.post(`/experiments/${id}/start`); } catch (err) {} }

    const backdrop = document.createElement('div');
    backdrop.className = 'drawer-backdrop';
    backdrop.innerHTML = `
      <div class="drawer" style="width:min(680px,100%);">
        <button class="btn btn-ghost btn-sm" id="close-drawer">✕ Close</button>
        <span class="badge mt-20">${escapeHtml(e.category)}</span>
        <h2 style="font-family:var(--font-display); margin:10px 0;">${escapeHtml(e.title)}</h2>

        <div class="exp-section-title">Aim</div><p class="exp-list-block">${escapeHtml(e.aim)}</p>
        <div class="exp-section-title">Theory</div><p class="exp-list-block">${escapeHtml(e.theory)}</p>
        <div class="exp-section-title">Principle</div><p class="exp-list-block">${escapeHtml(e.principle)}</p>

        <div class="exp-section-title">Apparatus</div>
        <ul class="exp-list-block">${e.apparatus.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>

        <div class="exp-section-title">Chemicals</div>
        <ul class="exp-list-block">${e.chemicals.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>

        <div class="exp-section-title">Procedure</div>
        <ol class="exp-list-block">${e.procedure.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ol>

        <div class="exp-section-title">Precautions</div>
        <ul class="exp-list-block">${e.precautions.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>

        <div class="exp-section-title">Observation</div><p class="exp-list-block">${escapeHtml(e.observation)}</p>
        <div class="exp-section-title">Calculation</div><p class="exp-list-block">${escapeHtml(e.calculation)}</p>
        <div class="exp-section-title">Result</div><p class="exp-list-block">${escapeHtml(e.result)}</p>

        <div class="exp-section-title">Viva Questions</div>
        <ul class="exp-list-block">${e.vivaQuestions.map(q => `<li>${escapeHtml(q)}</li>`).join('')}</ul>

        <div class="exp-section-title">Self-Check MCQs</div>
        <div id="exp-mcqs"></div>

        <button class="btn btn-primary mt-20" id="mark-complete-btn" style="width:100%;">✓ Mark Experiment Complete</button>
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', (ev) => { if (ev.target === backdrop) backdrop.remove(); });
    backdrop.querySelector('#close-drawer').addEventListener('click', () => backdrop.remove());

    let correctCount = 0;
    const mcqWrap = backdrop.querySelector('#exp-mcqs');
    e.mcqs.forEach((mcq, qi) => {
      const block = document.createElement('div');
      block.className = 'card mt-12';
      block.innerHTML = `<p style="margin:0 0 10px;">${qi+1}. ${escapeHtml(mcq.question)}</p>` +
        mcq.options.map((opt, oi) => `<button class="mcq-option" data-oi="${oi}">${escapeHtml(opt)}</button>`).join('');
      mcqWrap.appendChild(block);
      block.querySelectorAll('.mcq-option').forEach(btn => {
        btn.addEventListener('click', () => {
          if (block.dataset.answered) return;
          block.dataset.answered = '1';
          const oi = parseInt(btn.dataset.oi, 10);
          block.querySelectorAll('.mcq-option').forEach((b2, i2) => {
            if (i2 === mcq.answer) b2.classList.add('correct');
            else if (i2 === oi) b2.classList.add('incorrect');
          });
          if (oi === mcq.answer) correctCount++;
        });
      });
    });

    backdrop.querySelector('#mark-complete-btn').addEventListener('click', async () => {
      if (!Auth.user) { showToast('Log in to track experiment progress.', 'error'); return; }
      const score = Math.round((correctCount / (e.mcqs.length || 1)) * 100);
      await API.post(`/experiments/${id}/complete`, { score });
      showToast(`Experiment marked complete! Self-check score: ${score}%`);
      backdrop.remove();
    });
  }
};
