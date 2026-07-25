const Quiz = {
  questions: [],
  index: 0,
  correct: 0,
  answered: false,
  topics: [],

  async render(container) {
    const { topics } = await API.get('/quiz/topics');
    this.topics = topics;
    container.innerHTML = `
      <div class="view-header">
        <h1>Quiz Mode</h1>
        <p>Unlimited quizzes across MCQ, true/false, fill-in-the-blank, and match-the-following formats, with explanations for every answer.</p>
      </div>
      <div class="card" style="max-width:640px;" id="quiz-setup">
        <div class="field">
          <label class="field-label">Topic</label>
          <select class="input" id="quiz-topic">
            <option value="">Mixed (all topics)</option>
            ${this.topics.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label class="field-label">Number of Questions</label>
          <select class="input" id="quiz-count">
            <option value="5">5</option><option value="10" selected>10</option><option value="15">15</option><option value="20">20</option>
          </select>
        </div>
        <button class="btn btn-primary" id="quiz-start" style="width:100%;">Start Quiz</button>
      </div>
      <div id="quiz-play"></div>
    `;
    container.querySelector('#quiz-start').addEventListener('click', () => this.start(container));
  },

  async start(container) {
    const topic = container.querySelector('#quiz-topic').value;
    const count = container.querySelector('#quiz-count').value;
    const { questions } = await API.get(`/quiz/generate?count=${count}${topic ? `&topic=${encodeURIComponent(topic)}` : ''}`);
    this.questions = questions;
    this.index = 0;
    this.correct = 0;
    this.renderQuestion(container);
  },

  renderQuestion(container) {
    const playArea = container.querySelector('#quiz-play');
    if (this.index >= this.questions.length) {
      const pct = Math.round((this.correct / this.questions.length) * 100);
      playArea.innerHTML = `
        <div class="card mt-20" style="max-width:640px; text-align:center;">
          <h2 style="font-family:var(--font-display);">Quiz Complete!</h2>
          <div class="stat-value" style="font-size:44px;">${pct}%</div>
          <p class="text-mid">${this.correct} of ${this.questions.length} correct</p>
          <button class="btn btn-primary" id="quiz-retry">Take Another Quiz</button>
        </div>
      `;
      if (Auth.user) {
        API.post('/quiz/submit', { topic: container.querySelector('#quiz-topic')?.value || 'Mixed', totalQuestions: this.questions.length, correctAnswers: this.correct }).catch(()=>{});
      }
      playArea.querySelector('#quiz-retry').addEventListener('click', () => { playArea.innerHTML = ''; });
      return;
    }

    const q = this.questions[this.index];
    this.answered = false;
    const progressPct = Math.round((this.index / this.questions.length) * 100);

    let bodyHtml = '';
    if (q.type === 'mcq') {
      bodyHtml = `<p style="font-size:16px; margin-bottom:14px;">${escapeHtml(q.question)}</p>` +
        q.options.map((opt, i) => `<button class="mcq-option" data-i="${i}">${escapeHtml(opt)}</button>`).join('');
    } else if (q.type === 'trueFalse') {
      bodyHtml = `<p style="font-size:16px; margin-bottom:14px;">${escapeHtml(q.statement)}</p>
        <button class="mcq-option" data-tf="true">True</button>
        <button class="mcq-option" data-tf="false">False</button>`;
    } else if (q.type === 'fillBlanks') {
      bodyHtml = `<p style="font-size:16px; margin-bottom:14px;">${escapeHtml(q.sentence)}</p>
        <input class="input" id="fb-input" placeholder="Type your answer...">
        <button class="btn btn-primary mt-12" id="fb-submit">Submit</button>`;
    } else if (q.type === 'matchTheFollowing') {
      bodyHtml = `<p style="font-size:15px; margin-bottom:14px;">Match each item on the left to its correct pair on the right.</p>
        <div class="grid grid-2">
          <div>${q.left.map((l, i) => `<div class="card mb-12" style="padding:10px;">${i+1}. ${escapeHtml(l)}</div>`).join('')}</div>
          <div>${q.right.map((r, i) => `<select class="input mb-12" data-right="${i}">
            <option value="">Match to...</option>
            ${q.left.map((l, li) => `<option value="${li}">${li+1}. ${escapeHtml(l)}</option>`).join('')}
          </select>`).join('')}</div>
        </div>
        <button class="btn btn-primary" id="match-submit">Check Matches</button>`;
    }

    playArea.innerHTML = `
      <div class="card mt-20" style="max-width:640px;">
        <div class="flex-between small text-dim"><span>Question ${this.index + 1} of ${this.questions.length}</span><span>${q.topic || ''}</span></div>
        <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${progressPct}%;"></div></div>
        ${bodyHtml}
        <div id="quiz-feedback" class="mt-12"></div>
      </div>
    `;

    if (q.type === 'mcq') {
      playArea.querySelectorAll('.mcq-option').forEach(btn => {
        btn.addEventListener('click', () => this.handleAnswer(container, parseInt(btn.dataset.i, 10) === q.answer, q.explanation, btn, playArea.querySelectorAll('.mcq-option'), parseInt(btn.dataset.i,10), q.answer));
      });
    } else if (q.type === 'trueFalse') {
      playArea.querySelectorAll('[data-tf]').forEach(btn => {
        btn.addEventListener('click', () => this.handleAnswer(container, (btn.dataset.tf === 'true') === q.answer, q.explanation, btn, playArea.querySelectorAll('[data-tf]'), btn.dataset.tf === 'true', q.answer));
      });
    } else if (q.type === 'fillBlanks') {
      playArea.querySelector('#fb-submit').addEventListener('click', () => {
        const val = playArea.querySelector('#fb-input').value.trim().toLowerCase();
        const correct = val === q.answer.toLowerCase();
        this.finishAnswer(container, correct, `Correct answer: "${q.answer}"`);
      });
    } else if (q.type === 'matchTheFollowing') {
      playArea.querySelector('#match-submit').addEventListener('click', () => {
        const selects = [...playArea.querySelectorAll('[data-right]')];
        const chosen = selects.map(s => parseInt(s.value, 10));
        const correct = q.correctPairs.every((pair, i) => chosen[i] === pair);
        this.finishAnswer(container, correct, `Correct pairing: ${q.correctPairs.map((p,i) => `${q.right[i]} → ${q.left[p]}`).join('; ')}`);
      });
    }
  },

  handleAnswer(container, isCorrect, explanation, clickedBtn, allBtns, chosenVal, correctVal) {
    if (this.answered) return;
    this.answered = true;
    allBtns.forEach(b => {
      const isThisCorrect = (b.dataset.i != null ? parseInt(b.dataset.i,10) === correctVal : (b.dataset.tf === 'true') === correctVal);
      if (isThisCorrect) b.classList.add('correct');
    });
    if (!isCorrect) clickedBtn.classList.add('incorrect');
    this.finishAnswer(container, isCorrect, explanation, true);
  },

  finishAnswer(container, isCorrect, explanation, alreadyRendered) {
    if (isCorrect) this.correct++;
    const feedback = document.getElementById('quiz-feedback');
    feedback.innerHTML = `
      <p style="color:${isCorrect ? 'var(--ok)' : 'var(--danger)'}; font-weight:600;">${isCorrect ? '✓ Correct!' : '✕ Not quite.'}</p>
      <p class="small text-mid">${escapeHtml(explanation)}</p>
      <button class="btn btn-primary mt-12" id="next-q-btn">Next Question →</button>
    `;
    feedback.querySelector('#next-q-btn').addEventListener('click', () => {
      this.index++;
      this.renderQuestion(container);
    });
  }
};
