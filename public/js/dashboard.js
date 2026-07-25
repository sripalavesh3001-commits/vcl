const Dashboard = {
  quickLinks: [
    { view: 'periodic-table', icon: '▦', title: 'Periodic Table', desc: 'Browse every element' },
    { view: 'lab', icon: '⚗', title: 'Virtual Lab', desc: 'Mix reagents & react' },
    { view: 'calculators', icon: '∑', title: 'Calculators', desc: 'Molarity, moles & more' },
    { view: 'experiments', icon: '🧪', title: 'Experiments', desc: 'Guided experiment library' },
    { view: 'quiz', icon: '✓', title: 'Quiz Mode', desc: 'Test what you know' },
    { view: 'tutor', icon: '✦', title: 'AI Tutor', desc: 'Ask a chemistry question' }
  ],

  async render(container) {
    const d = await API.get('/dashboard/student');

    container.innerHTML = `
      <div class="view-header">
        <h1>Welcome back, ${escapeHtml(Auth.user.name.split(' ')[0])}</h1>
        <p>Here's a snapshot of your progress across the Virtual Chemistry Lab.</p>
      </div>

      <div class="bento-grid">
        <div class="bento-item bento-span-2 bento-row-2">
          <div class="bento-tile-title" style="font-size:16px;">Overall Progress</div>
          <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${d.progressPercent}%;"></div></div>
          <p class="small text-mid">${d.progressPercent}% of the core experiment set completed</p>

          <div class="exp-section-title">Badges</div>
          <div>${d.badges.length ? d.badges.map(b => `<span class="badge-pill">🏅 ${escapeHtml(b.badge_name)}</span>`).join('') : '<p class="small text-dim">Complete experiments and quizzes to earn badges.</p>'}</div>
        </div>

        <div class="bento-item stat-card"><div class="stat-value">${d.completedExperiments.length}</div><div class="stat-label">Experiments Completed</div></div>
        <div class="bento-item stat-card"><div class="stat-value">${d.averageQuizScore}%</div><div class="stat-label">Avg. Quiz Score</div></div>
        <div class="bento-item stat-card"><div class="stat-value">${d.reactionCount}</div><div class="stat-label">Reactions Performed</div></div>
        <div class="bento-item stat-card"><div class="stat-value">${d.badges.length}</div><div class="stat-label">Badges Earned</div></div>

        <div class="bento-item bento-span-2">
          <div class="bento-tile-title" style="font-size:16px;">Recent Activity</div>
          <div class="mt-12">
            ${d.recentActivity.length ? d.recentActivity.map(a => `
              <div class="inventory-row"><span>${a.type === 'experiment' ? '🧪' : a.type === 'quiz' ? '✓' : '⚗'} ${escapeHtml(a.label || '')}</span><span class="small text-dim">${a.ts ? new Date(a.ts).toLocaleDateString() : ''}</span></div>
            `).join('') : '<p class="small text-dim">No activity yet — try an experiment, quiz, or reaction!</p>'}
          </div>
        </div>

        <div class="bento-item bento-span-4">
          <div class="flex-between mb-12"><strong>Quick Launch</strong><span class="small text-dim">Jump straight into a section</span></div>
          <div class="bento-grid" id="quick-launch-grid" style="grid-template-columns: repeat(6, 1fr);">
            ${this.quickLinks.map(q => `
              <div class="bento-item interactive" data-view="${q.view}">
                <div class="bento-tile-icon">${q.icon}</div>
                <div class="bento-tile-title">${q.title}</div>
                <div class="bento-tile-desc">${q.desc}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="bento-item bento-span-4">
          <strong>Quiz History</strong>
          <div class="mt-12">
            ${d.quizAttempts.length ? d.quizAttempts.map(q => `
              <div class="inventory-row"><span>${escapeHtml(q.topic)}</span><span class="mono">${q.correct_answers}/${q.total_questions} (${q.score_percent}%)</span></div>
            `).join('') : '<p class="small text-dim">No quizzes taken yet.</p>'}
          </div>
        </div>
      </div>
    `;

    container.querySelectorAll('#quick-launch-grid [data-view]').forEach(tile => {
      tile.addEventListener('click', () => App.navigate(tile.dataset.view));
    });
  }
};
