const App = {
  currentView: 'dashboard',

  views: {
    'dashboard': { title: 'Dashboard', render: (c) => Dashboard.render(c) },
    'periodic-table': { title: 'Periodic Table', render: (c) => PeriodicTable.render(c) },
    'lab': { title: 'Virtual Lab', render: (c) => Lab.render(c) },
    'calculators': { title: 'Calculators', render: (c) => Calculators.render(c) },
    'experiments': { title: 'Experiment Library', render: (c) => Experiments.render(c) },
    'quiz': { title: 'Quiz Mode', render: (c) => Quiz.render(c) },
    'tutor': { title: 'AI Chemistry Tutor', render: (c) => Tutor.render(c) }
  },

  async init() {
    this.bindShell();
    await Auth.init();
    this.enterApp();
  },

  enterApp() {
    document.getElementById('user-name-label').textContent = Auth.user.name;
    document.getElementById('avatar-dot').textContent = Auth.user.name.charAt(0).toUpperCase();
    this.navigate('dashboard');
  },

  bindShell() {
    document.querySelectorAll('.nav-link[data-view]').forEach(link => {
      link.addEventListener('click', () => this.navigate(link.dataset.view));
    });

    document.getElementById('mobile-nav-toggle').addEventListener('click', () => {
      document.getElementById('navbar-links').classList.toggle('open');
    });

    document.getElementById('theme-toggle').addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light');
      document.getElementById('theme-toggle').textContent = isLight ? '☀ Light' : '☾ Dark';
    });
  },

  async navigate(viewKey) {
    const view = this.views[viewKey];
    if (!view) return;
    this.currentView = viewKey;

    document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.view === viewKey));
    document.getElementById('navbar-links').classList.remove('open');

    const container = document.getElementById('view-container');
    container.innerHTML = `<p class="text-dim">Loading...</p>`;
    try {
      await view.render(container);
    } catch (err) {
      container.innerHTML = `<div class="card" style="border-color:var(--danger);">Failed to load: ${escapeHtml(err.message)}</div>`;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
