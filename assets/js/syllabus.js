/* ============================================================
   QuizFlow — Syllabus chooser (redesigned)
   Pick chapters, type question count, choose difficulty,
   then AI generates a quiz.
   ============================================================ */

(function () {
  'use strict';

  var session = window.QuizFlowAuth.getSession();

  var params = new URLSearchParams(window.location.search);
  var subjectId = parseInt(params.get('id'), 10);

  var state = {
    subject: null,
    selected: {},
    count: 10,
    difficulty: 'medium'
  };

  var els = {
    eyebrow: document.getElementById('sylEyebrow'),
    title: document.getElementById('sylTitle'),
    desc: document.getElementById('sylDesc'),
    chapters: document.getElementById('chapterList'),
    selectAll: document.getElementById('selectAllBtn'),
    clearAll: document.getElementById('clearAllBtn'),
    countInput: document.getElementById('countInput'),
    diffSeg: document.getElementById('diffSeg'),
    avail: document.getElementById('availNote'),
    gen: document.getElementById('genBtn'),
    genNote: document.getElementById('genNote')
  };

  function initNav() {
    var cta = document.getElementById('navCta');
    var avatar = document.getElementById('navAvatar');
    if (session) {
      cta.textContent = 'Dashboard';
      cta.href = session.role === 'Admin' ? 'admin.html' : 'dashboard.html';
      if (avatar) {
        avatar.classList.remove('hidden');
        avatar.textContent = (session.name || 'S')
          .split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
      }
    }
  }

  /* ---------- Chapters ---------- */
  function renderChapters(subject) {
    els.chapters.innerHTML = '';
    subject.chapters.forEach(function (ch, idx) {
      var card = document.createElement('div');
      card.className = 'chapter-card glass-card expanded';
      card.dataset.cid = ch.id;
      state.selected[ch.id] = true;

      /* Header */
      var header = document.createElement('div');
      header.className = 'chapter-header';
      header.addEventListener('click', function () {
        state.expanded[ch.id] = !state.expanded[ch.id];
        card.classList.toggle('expanded', state.expanded[ch.id]);
      });

      var left = document.createElement('div');
      left.className = 'chapter-left';

      var meta = document.createElement('div');
      meta.className = 'chapter-meta';

      var head = document.createElement('div');
      head.className = 'chapter-head';

      var numSpan = document.createElement('span');
      numSpan.className = 'chapter-num';
      numSpan.textContent = 'Unit ' + (idx + 1);

      var h3 = document.createElement('h3');
      h3.textContent = ch.title;

      var badge = document.createElement('span');
      badge.className = 'chapter-count';
      badge.textContent = ch.count + ' questions';

      head.appendChild(numSpan);
      head.appendChild(h3);
      head.appendChild(badge);

      var chips = document.createElement('div');
      chips.className = 'topic-chips';
      ch.topics.forEach(function (t) {
        var chip = document.createElement('span');
        chip.className = 'topic-chip';
        chip.textContent = t;
        chips.appendChild(chip);
      });

      meta.appendChild(head);
      meta.appendChild(chips);
      left.appendChild(meta);

      var expandIcon = document.createElement('span');
      expandIcon.className = 'expand-icon';
      expandIcon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';

      header.appendChild(left);
      header.appendChild(expandIcon);
      card.appendChild(header);
      els.chapters.appendChild(card);
    });
  }

  function setAll(select) {
    if (!state.subject) return;
    state.subject.chapters.forEach(function (ch) {
      if (select) state.selected[ch.id] = true;
      else delete state.selected[ch.id];
    });
    els.chapters.querySelectorAll('.chapter-card').forEach(function (card) {
      card.classList.toggle('off', !select);
      var badge = card.querySelector('.chapter-count');
      var ch = state.subject.chapters.find(function (c) { return c.id === card.dataset.cid; });
      if (badge && ch) badge.textContent = ch.count + ' questions';
    });
    refreshAvail();
  }

  /* ---------- Availability ---------- */
  function totalAvailable() {
    var topics = Object.keys(state.selected);
    if (!topics.length || !state.subject) return 0;
    return state.subject.chapters
      .filter(function (c) { return topics.indexOf(c.id) !== -1; })
      .reduce(function (sum, c) { return sum + c.count; }, 0);
  }

  function refreshAvail() {
    var avail = totalAvailable();
    var n = state.count;

    if (els.countInput) {
      els.countInput.max = avail || 50;
      els.countInput.placeholder = '1 - ' + (avail || 50);
    }

    if (avail === 0) {
      els.avail.textContent = 'Select at least one chapter to continue.';
      els.avail.classList.add('warn');
      els.gen.disabled = true;
    } else if (n > avail) {
      els.avail.textContent = 'You want ' + n + ' but only ' + avail + ' available. Lower the number or select more chapters.';
      els.avail.classList.add('warn');
      els.gen.disabled = true;
    } else {
      els.avail.textContent = n + ' question' + (n !== 1 ? 's' : '') + ' will be generated from ' + avail + ' available.';
      els.avail.classList.remove('warn');
      els.gen.disabled = false;
    }
    syncDiff();
  }

  function syncDiff() {
    els.diffSeg.querySelectorAll('.seg-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-diff') === state.difficulty);
    });
  }

  /* ---------- Generate ---------- */
  function generate() {
    if (!session) { window.location.href = 'login.html'; return; }

    var topics = Object.keys(state.selected);
    var avail = totalAvailable();
    var count = Math.min(state.count, avail) || 1;

    els.gen.disabled = true;
    els.gen.innerHTML = 'Generating\u2026 <span class="spinner" style="display:inline-block"></span>';

    window.QuizFlowAPI.generateQuiz(subjectId, {
      topics: topics,
      count: count,
      difficulty: state.difficulty
    }).then(function (res) {
      window.location.href = 'quiz.html?gen=' + encodeURIComponent(res.token);
    }).catch(function (err) {
      els.gen.disabled = false;
      els.gen.textContent = 'Generate Quiz';
      els.genNote.textContent = err && err.message ? err.message : 'Generation failed. Try again.';
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    initNav();

    els.selectAll.addEventListener('click', function () { setAll(true); });
    els.clearAll.addEventListener('click', function () { setAll(false); });

    if (els.countInput) {
      els.countInput.addEventListener('input', function () {
        var v = parseInt(els.countInput.value, 10);
        state.count = (v > 0) ? v : 1;
        refreshAvail();
      });
    }

    els.diffSeg.addEventListener('click', function (e) {
      var b = e.target.closest('.seg-btn');
      if (!b) return;
      state.difficulty = b.getAttribute('data-diff');
      syncDiff();
    });

    els.gen.addEventListener('click', generate);

    if (!subjectId) {
      els.title.textContent = 'Subject not found';
      els.desc.textContent = 'Please go back and pick a subject.';
      els.chapters.innerHTML = '<div class="empty"><div class="empty-ic">\uD83D\uDD0D</div>No subject selected.</div>';
      return;
    }

    window.QuizFlowAPI.getSyllabus(subjectId).then(function (subject) {
      state.subject = subject;
      els.eyebrow.textContent = subject.short + ' \u00b7 Syllabus';
      els.title.textContent = subject.icon + ' ' + subject.category;
      els.desc.textContent = subject.description;
      renderChapters(subject);
      refreshAvail();
    }).catch(function (err) {
      els.title.textContent = 'Subject not found';
      els.desc.textContent = err && err.message ? err.message : 'Could not load this subject.';
      els.chapters.innerHTML = '<div class="empty"><div class="empty-ic">\uD83D\uDD0D</div>No syllabus available.</div>';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
