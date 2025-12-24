// application-modal.js
// 申込期間モーダルの表示・一覧・詳細切り替えを管理するスクリプト

window.addEventListener('DOMContentLoaded', () => {
  const periods = [
    {
      id: 'p-spring',
      label: '上',
      name: '2026年度上期募集',
      from: '2026-05-01',
      to: '2026-05-15',
      sessions: [
        { open: '2026-06-01', deadline: '2026-05-15' },
        { open: '2026-07-01', deadline: '2026-05-15' },
      ],
    },
    {
      id: 'p-autumn',
      label: '下',
      name: '2026年度下期募集',
      from: '2026-11-01',
      to: '2026-11-15',
      sessions: [
        { open: '2026-12-01', deadline: '2026-11-15' },
        { open: '2026-12-15', deadline: '2026-11-15' },
        { open: '2027-01-05', deadline: '2026-11-15' },
      ],
    },
  ];

  let activeId = periods[0]?.id || null;
  let editingSessionIndex = null;

  const periodListEl = document.getElementById('period-list');
  const periodEmptyEl = document.getElementById('period-empty');
  const periodTpl = document.getElementById('period-row-tpl');
  const detailSection = document.getElementById('period-detail');
  const detailTitle = document.getElementById('detail-title');
  const detailRange = document.getElementById('detail-range');
  const sessionListEl = document.getElementById('session-list');
  const sessionEmptyEl = document.getElementById('session-empty');
  const sessionTpl = document.getElementById('session-row-tpl');

  const periodNameInput = document.getElementById('period-name');
  const periodFromInput = document.getElementById('period-from');
  const periodToInput = document.getElementById('period-to');
  const addPeriodBtn = document.getElementById('add-period');

  const sessionOpenInput = document.getElementById('session-open');
  const sessionDeadlineInput = document.getElementById('session-deadline');
  const addSessionBtn = document.getElementById('add-session');

  const highlightInput = (el) => {
    if (!el) return;
    el.classList.add('ring-2', 'ring-red-400');
    setTimeout(() => el.classList.remove('ring-2', 'ring-red-400'), 1800);
  };

  const toDisplayDate = (value) => (value ? value.replace(/-/g, '/') : '');

  const deriveLabel = (name) => {
    const target = (name || '').trim();
    const matched = target.match(/[上中下]/);
    if (matched) return matched[0];
    return target ? target.charAt(0).toUpperCase() : '期';
  };

  const currentPeriod = () => periods.find((p) => p.id === activeId);

  const setEmptyStates = () => {
    periodEmptyEl.classList.toggle('hidden', periods.length > 0);
    const hasDetail = Boolean(activeId && currentPeriod());
    detailSection.classList.toggle('hidden', !hasDetail);
    if (!hasDetail) {
      sessionListEl.innerHTML = '';
      sessionEmptyEl.classList.add('hidden');
    }
  };

  const renderSessions = () => {
    const period = currentPeriod();
    if (!period) return;

    sessionListEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    period.sessions.forEach((session, index) => {
      const node = sessionTpl.content.firstElementChild.cloneNode(true);
      node.dataset.index = index;
      node.querySelector('.open').textContent = `開講日：${toDisplayDate(session.open)}`;
      node.querySelector('.deadline').textContent = `申込締め切り：${toDisplayDate(session.deadline)}`;

      node.querySelector('.remove').addEventListener('click', (e) => {
        e.stopPropagation();
        period.sessions.splice(index, 1);
        editingSessionIndex = null;
        addSessionBtn.textContent = '追加';
        renderSessions();
        renderPeriods();
      });

      node.querySelector('.edit').addEventListener('click', (e) => {
        e.stopPropagation();
        editingSessionIndex = index;
        sessionOpenInput.value = session.open;
        sessionDeadlineInput.value = session.deadline;
        addSessionBtn.textContent = '更新';
        sessionOpenInput.focus();
      });

      frag.appendChild(node);
    });
    sessionListEl.appendChild(frag);
    sessionEmptyEl.classList.toggle('hidden', period.sessions.length > 0);
  };

  const renderDetail = () => {
    const period = currentPeriod();
    if (!period) {
      setEmptyStates();
      return;
    }
    detailTitle.textContent = period.name || '';
    detailRange.textContent = `期間：${toDisplayDate(period.from)} - ${toDisplayDate(period.to)}`;
    renderSessions();
    setEmptyStates();
  };

  const renderPeriods = () => {
    periodListEl.innerHTML = '';
    const frag = document.createDocumentFragment();

    periods.forEach((period) => {
      const node = periodTpl.content.firstElementChild.cloneNode(true);
      node.dataset.id = period.id;
      node.querySelector('.label').textContent = period.label || deriveLabel(period.name);
      node.querySelector('.title').textContent = period.name;
      node.querySelector('.count').textContent = `開講日 ${period.sessions.length}件`;
      node.querySelector('.range').textContent = `期間：${toDisplayDate(period.from)} - ${toDisplayDate(period.to)}`;

      if (period.id === activeId) {
        node.classList.add('bg-blue-50', 'border-blue-100');
      }

      node.addEventListener('click', () => {
        activeId = period.id === activeId ? null : period.id;
        editingSessionIndex = null;
        addSessionBtn.textContent = '追加';
        renderDetail();
        renderPeriods();
      });

      node.querySelector('.edit').addEventListener('click', (e) => {
        e.stopPropagation();
        activeId = period.id;
        periodNameInput.value = period.name;
        periodFromInput.value = period.from;
        periodToInput.value = period.to;
        renderDetail();
        renderPeriods();
        periodNameInput.focus();
      });

      node.querySelector('.remove').addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = periods.findIndex((p) => p.id === period.id);
        if (idx >= 0) periods.splice(idx, 1);
        if (activeId === period.id) {
          activeId = periods[0]?.id || null;
          editingSessionIndex = null;
        }
        renderPeriods();
        renderDetail();
      });

      frag.appendChild(node);
    });

    periodListEl.appendChild(frag);
    setEmptyStates();
  };

  const addPeriod = () => {
    const name = periodNameInput.value.trim();
    const from = periodFromInput.value;
    const to = periodToInput.value;

    if (!name || !from || !to) {
      [periodNameInput, periodFromInput, periodToInput].forEach((el) => {
        if (!el.value) highlightInput(el);
      });
      return;
    }

    const id = `p-${Math.random().toString(36).slice(2, 9)}`;
    periods.unshift({
      id,
      label: deriveLabel(name),
      name,
      from,
      to,
      sessions: [],
    });
    activeId = id;
    periodNameInput.value = '';
    periodFromInput.value = '';
    periodToInput.value = '';
    renderPeriods();
    renderDetail();
  };

  const addOrUpdateSession = () => {
    const period = currentPeriod();
    if (!period) {
      highlightInput(periodNameInput);
      return;
    }
    const open = sessionOpenInput.value;
    const deadline = sessionDeadlineInput.value;
    if (!open || !deadline) {
      [sessionOpenInput, sessionDeadlineInput].forEach((el) => {
        if (!el.value) highlightInput(el);
      });
      return;
    }

    const payload = { open, deadline };
    if (editingSessionIndex !== null) {
      period.sessions[editingSessionIndex] = payload;
    } else {
      period.sessions.unshift(payload);
    }

    editingSessionIndex = null;
    addSessionBtn.textContent = '追加';
    sessionOpenInput.value = '';
    sessionDeadlineInput.value = '';
    renderSessions();
    renderPeriods();
  };

  addPeriodBtn.addEventListener('click', addPeriod);
  addSessionBtn.addEventListener('click', addOrUpdateSession);

  renderPeriods();
  renderDetail();
});
