const Tutor = {
  mode: 'beginner',
  history: [],

  async render(container) {
    const status = await API.get('/tutor/status').catch(() => ({ configured: false }));
    container.innerHTML = `
      <div class="view-header">
        <h1>AI Chemistry Tutor</h1>
        <p>Ask about reactions, mechanisms, equation balancing, or any chemistry concept.
        ${status.configured ? '' : '<span style="color:var(--flame);">Running in offline demo mode — connect an Anthropic API key on the server for full conversational answers.</span>'}</p>
      </div>
      <div class="card" style="max-width:720px;">
        <div class="flex-between mb-12">
          <div class="mode-toggle">
            <button class="mode-btn ${this.mode==='beginner'?'active':''}" data-mode="beginner">Beginner</button>
            <button class="mode-btn ${this.mode==='advanced'?'active':''}" data-mode="advanced">Advanced</button>
          </div>
          <span class="badge">${status.configured ? '● Live AI' : '○ Offline Mode'}</span>
        </div>
        <div class="chat-window" id="chat-window"></div>
        <div class="flex gap-8 mt-12">
          <input class="input" id="chat-input" placeholder="e.g. Why does zinc displace copper from copper sulfate?">
          <button class="btn btn-primary" id="chat-send">Send</button>
        </div>
      </div>
    `;

    container.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.mode = btn.dataset.mode;
        container.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b === btn));
      });
    });

    const send = async () => {
      const input = container.querySelector('#chat-input');
      const msg = input.value.trim();
      if (!msg) return;
      input.value = '';
      this.appendBubble(container, 'user', msg);
      this.history.push({ role: 'user', content: msg });
      const thinkingId = this.appendBubble(container, 'assistant', '…thinking…');
      try {
        const { reply } = await API.post('/tutor/chat', { message: msg, mode: this.mode, history: this.history });
        document.getElementById(thinkingId).textContent = reply;
        this.history.push({ role: 'assistant', content: reply });
      } catch (err) {
        document.getElementById(thinkingId).textContent = 'Something went wrong reaching the tutor: ' + err.message;
      }
    };
    container.querySelector('#chat-send').addEventListener('click', send);
    container.querySelector('#chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
  },

  appendBubble(container, role, text) {
    const window_ = container.querySelector('#chat-window');
    const id = 'bubble-' + Math.random().toString(36).slice(2);
    const div = document.createElement('div');
    div.className = `chat-bubble ${role}`;
    div.id = id;
    div.textContent = text;
    window_.appendChild(div);
    window_.scrollTop = window_.scrollHeight;
    return id;
  }
};
