(() => {
  'use strict';

  const DATA = window.TIMEBOOK_DATA;
  const TERMS = DATA.terms;
  const SEASONS = DATA.seasons;
  const DAY_MS = 86400000;
  const RAD = Math.PI / 180;
  const STORAGE_KEY = 'timebook.journal.v1';
  const LEARNING_STORAGE_KEY = 'timebook.learning.v1';
  const quizLength = 8;
  const DIMENSIONS = { astronomy: '天文', phenology: '物候', culture: '文化' };
  const PENTAD_PAGE_SIZE = 4;

  const state = {
    currentTermId: null,
    selectedTermId: null,
    currentTermStart: null,
    nextTermStart: null,
    pentadFilter: 'all',
    pentadQuery: '',
    pentadVisibleCount: PENTAD_PAGE_SIZE,
    pentadLoadArmed: false,
    journal: loadJournal(),
    learningProfile: loadLearningProfile(),
    quiz: null
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const termByName = new Map(TERMS.map(term => [term.name, term]));
  const termById = new Map(TERMS.map(term => [term.id, term]));

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  function formatDate(date, withYear = false) {
    const formatter = new Intl.DateTimeFormat('zh-CN', withYear
      ? { year: 'numeric', month: 'long', day: 'numeric' }
      : { month: 'long', day: 'numeric' });
    return formatter.format(date);
  }

  function formatDateTime(date) {
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
    }).format(date);
  }

  function formatCountdown(ms) {
    if (!Number.isFinite(ms) || ms < 0) return '正在交节';
    const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) return `${days}天 ${hours}小时`;
    if (hours > 0) return `${hours}小时 ${minutes}分`;
    return `${minutes}分钟`;
  }

  function julianDay(date) {
    return date.getTime() / DAY_MS + 2440587.5;
  }

  function sunLongitude(date) {
    const T = (julianDay(date) - 2451545.0) / 36525;
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M * RAD)
      + (0.019993 - 0.000101 * T) * Math.sin(2 * M * RAD)
      + 0.000289 * Math.sin(3 * M * RAD);
    const omega = 125.04 - 1934.136 * T;
    const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * RAD);
    return ((lambda % 360) + 360) % 360;
  }

  function obliquity(date) {
    const T = (julianDay(date) - 2451545.0) / 36525;
    const omega = 125.04 - 1934.136 * T;
    return 23.439291 - 0.0130042 * T - 1.64e-7 * T * T + 5.036e-7 * T * T * T
      + 0.00256 * Math.cos(omega * RAD);
  }

  function solarDeclinationFromLongitude(lambda, date = new Date()) {
    return Math.asin(Math.sin(obliquity(date) * RAD) * Math.sin(lambda * RAD)) / RAD;
  }

  function formatDeclination(declination) {
    if (Math.abs(declination) < 0.05) return '赤道附近';
    return `${declination >= 0 ? '北纬' : '南纬'} ${Math.abs(declination).toFixed(1)}°`;
  }

  function findCurrentTerm(date) {
    const lambda = sunLongitude(date);
    let winner = TERMS[0];
    let bestDelta = 360;
    TERMS.forEach(term => {
      const delta = (lambda - term.longitude + 360) % 360;
      if (delta < bestDelta) {
        bestDelta = delta;
        winner = term;
      }
    });
    return winner;
  }

  function signedLongitudeDifference(date, target) {
    let delta = (sunLongitude(date) - target + 360) % 360;
    if (delta > 180) delta -= 360;
    return delta;
  }

  function findTermCrossing(targetLongitude, nearDate) {
    let low = new Date(nearDate.getTime() - 24 * DAY_MS);
    let high = new Date(nearDate.getTime() + 24 * DAY_MS);
    let guard = 0;
    while (signedLongitudeDifference(low, targetLongitude) > 0 && guard < 10) {
      low = new Date(low.getTime() - DAY_MS);
      guard += 1;
    }
    guard = 0;
    while (signedLongitudeDifference(high, targetLongitude) < 0 && guard < 10) {
      high = new Date(high.getTime() + DAY_MS);
      guard += 1;
    }
    for (let i = 0; i < 48; i += 1) {
      const mid = new Date((low.getTime() + high.getTime()) / 2);
      if (signedLongitudeDifference(mid, targetLongitude) < 0) low = mid;
      else high = mid;
    }
    return new Date((low.getTime() + high.getTime()) / 2);
  }

  function getTermContext(date = new Date()) {
    const current = findCurrentTerm(date);
    const next = TERMS[(current.order + 1) % TERMS.length];
    const currentStart = findTermCrossing(current.longitude, date);
    let nextStart = findTermCrossing(next.longitude, date);
    if (nextStart <= date) nextStart = new Date(nextStart.getTime() + 365.2422 * DAY_MS);
    return { current, next, currentStart, nextStart, lambda: sunLongitude(date) };
  }

  function applyTheme(term) {
    const season = SEASONS[term.season];
    const root = document.documentElement;
    root.style.setProperty('--accent', term.palette.accent);
    root.style.setProperty('--accent-deep', term.palette.deep);
    root.style.setProperty('--season-soft', term.palette.bg2);
    root.style.setProperty('--season-ink', season.ink);
    document.body.dataset.season = term.season;
    $('meta[name="theme-color"]')?.setAttribute('content', term.palette.deep);
  }

  function buildHeroOrbit() {
    const orbit = $('#heroOrbit');
    if (!orbit) return;
    TERMS.forEach(term => {
      const angle = (term.order / 24) * Math.PI * 2 - Math.PI / 2;
      const radius = 45;
      const x = 50 + Math.cos(angle) * radius;
      const y = 50 + Math.sin(angle) * radius;
      const node = document.createElement('span');
      node.className = 'orbit-node';
      node.dataset.termId = term.id;
      node.textContent = term.name;
      node.style.left = `${x}%`;
      node.style.top = `${y}%`;
      node.style.margin = '0';
      node.style.transform = 'translate(-50%, -50%)';
      orbit.appendChild(node);
    });
  }

  function buildWheel() {
    const container = $('#wheelTerms');
    if (!container) return;
    TERMS.forEach(term => {
      const angle = (term.order / 24) * Math.PI * 2 - Math.PI / 2;
      const radius = 42.5;
      const x = 50 + Math.cos(angle) * radius;
      const y = 50 + Math.sin(angle) * radius;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'wheel-term';
      button.dataset.termId = term.id;
      button.textContent = term.name;
      button.setAttribute('aria-label', `${term.name}，太阳黄经${term.longitude}度`);
      button.style.left = `${x}%`;
      button.style.top = `${y}%`;
      button.style.margin = '0';
      button.style.transform = 'translate(-50%, -50%)';
      button.addEventListener('click', () => selectTerm(term.id));
      container.appendChild(button);
    });
  }

  function updateOrbitMarker() {
    $$('.orbit-node').forEach(node => {
      node.classList.toggle('is-current', node.dataset.termId === state.currentTermId);
    });
  }

  function selectTerm(termId, options = {}) {
    const term = termById.get(termId);
    if (!term) return;
    state.selectedTermId = term.id;
    applyTheme(term);
    $$('.wheel-term').forEach(button => {
      const active = button.dataset.termId === term.id;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    $('#wheelSeason').textContent = SEASONS[term.season].label;
    $('#wheelTerm').textContent = term.name;
    $('#wheelHint').textContent = `黄经 ${term.longitude}°`;
    $('#orbitSeason').textContent = SEASONS[term.season].name;
    $('#orbitTerm').textContent = term.name;
    $('#orbitLongitude').textContent = `黄经 ${term.longitude}°`;
    renderTermDetail(term);
    updateObservationPrompt(term);
    if (options.syncJournal !== false) syncJournalTerm(term.id);
    renderCardPreview();
    if (options.scroll) {
      $('#wheel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function refreshLive() {
    const context = getTermContext(new Date());
    state.currentTermId = context.current.id;
    state.currentTermStart = context.currentStart;
    state.nextTermStart = context.nextStart;

    const now = new Date();
    $('#todayLabel').textContent = formatDate(now, true);
    $('#liveSeason').textContent = SEASONS[context.current.season].name;
    $('#liveTermName').textContent = context.current.name;
    $('#liveTermPinyin').textContent = context.current.pinyin;
    $('#liveTermPhrase').textContent = context.current.phrase;
    $('#liveLongitude').textContent = `${context.lambda.toFixed(1)}°`;
    $('#liveCountdown').textContent = formatCountdown(context.nextStart.getTime() - now.getTime());

    $('#scienceLongitude').textContent = `${context.lambda.toFixed(1)}°`;
    $('#scienceDeclination').textContent = formatDeclination(solarDeclinationFromLongitude(context.lambda, now));
    $('#scienceNextTerm').textContent = `${context.next.name} · ${formatDate(context.nextStart)}`;
    $('#scienceTitle').textContent = `此刻，太阳位于${context.current.name}`;
    $('#scienceCopy').textContent = `太阳视黄经约为 ${context.lambda.toFixed(1)}°，下一个节气是${context.next.name}，预计在 ${formatDateTime(context.nextStart)} 交节。`;

    updateOrbitMarker();
    renderPentads();
    if (!state.selectedTermId) selectTerm(context.current.id);
    if (state.selectedTermId === context.current.id) {
      $('#orbitSeason').textContent = SEASONS[context.current.season].name;
      $('#orbitTerm').textContent = context.current.name;
      $('#orbitLongitude').textContent = `黄经 ${context.current.longitude}°`;
    }
  }
  function renderTermDetail(term) {
    const season = SEASONS[term.season];
    const panel = $('#termDetail');
    if (!panel) return;
    const declination = solarDeclinationFromLongitude(term.longitude);
    panel.innerHTML = `
      <div class="term-watermark" aria-hidden="true">${escapeHTML(term.glyph)}</div>
      <div class="term-head">
        <div>
          <div class="term-label">${escapeHTML(season.name)} · ${escapeHTML(term.dateHint)}</div>
          <div class="term-title-row">
            <h3>${escapeHTML(term.name)}</h3>
            <span>${escapeHTML(term.pinyin)}</span>
          </div>
          <div class="term-tags">
            <span class="term-tag">${escapeHTML(term.phrase)}</span>
            ${term.custom.map(item => `<span class="term-tag">${escapeHTML(item)}</span>`).join('')}
          </div>
        </div>
        <span class="term-season-badge" title="${escapeHTML(season.name)}">${escapeHTML(season.label)}</span>
      </div>
      <p class="term-summary">${escapeHTML(term.summary)}</p>
      <div class="term-metrics">
        <div class="term-metric"><span>太阳视黄经</span><b>${term.longitude}°</b></div>
        <div class="term-metric"><span>太阳直射点</span><b>${formatDeclination(declination)}</b></div>
        <div class="term-metric"><span>大约交节</span><b>${escapeHTML(term.dateHint)}</b></div>
      </div>
      <div class="term-pentads">
        ${term.pentads.map((pentad, index) => `
          <div class="term-pentad">
            <span>${['初候', '二候', '三候'][index]}</span>
            <strong>${escapeHTML(pentad.name)}</strong>
            <p>${escapeHTML(pentad.note)}</p>
          </div>`).join('')}
      </div>
      <div class="term-bottom">
        <div class="term-poem">
          <blockquote>“${escapeHTML(term.poem.text)}”</blockquote>
          <cite>${escapeHTML(term.poem.author)} ${escapeHTML(term.poem.work)}</cite>
        </div>
        <div class="term-science">
          <span>科学解释</span>
          <p>${escapeHTML(term.fact)}</p>
          <p><b>农事：</b>${escapeHTML(term.agriculture)}</p>
          <p><b>生活：</b>${escapeHTML(term.health)}</p>
        </div>
      </div>`;
  }

  function updateObservationPrompt(term) {
    const prompt = term.pentads[1]?.note || term.pentads[0]?.note || '记录今天的风、云、光线和植物变化。';
    $('#observationPrompt').textContent = `今天的观察线索：${prompt}`;
  }

  function getCurrentPentadIndex() {
    if (!state.currentTermStart) return 0;
    const elapsedDays = Math.max(0, (Date.now() - state.currentTermStart.getTime()) / DAY_MS);
    return Math.min(2, Math.floor(elapsedDays / 5));
  }

  function renderPentads() {
    const grid = $('#pentadGrid');
    if (!grid) return;
    const currentPentadIndex = getCurrentPentadIndex();
    const cards = [];
    TERMS.forEach(term => {
      term.pentads.forEach((pentad, index) => {
        const season = SEASONS[term.season];
        const isCurrent = state.currentTermId === term.id && currentPentadIndex === index;
        cards.push(`
          <button class="pentad-card${isCurrent ? ' is-current' : ''}" type="button" data-term-id="${term.id}"
            data-term-name="${escapeHTML(term.name)}" data-season="${term.season}" style="--card-accent:${season.color}"
            aria-label="查看${term.name}${['初候', '二候', '三候'][index]}${pentad.name}">
            <div class="pentad-card-top">
              <span class="pentad-season">${season.label}季</span>
              <span>${escapeHTML(term.name)} · ${['初候', '二候', '三候'][index]}</span>
            </div>
            <strong>${escapeHTML(pentad.name)}</strong>
            <p>${escapeHTML(pentad.note)}</p>
          </button>`);
      });
    });
    grid.innerHTML = cards.join('');
    applyPentadFilter(state.pentadFilter);
  }

  function applyPentadFilter(filter = state.pentadFilter, reset = false) {
    state.pentadFilter = filter;
    if (reset) {
      state.pentadVisibleCount = PENTAD_PAGE_SIZE;
      state.pentadLoadArmed = false;
    }

    $$('.season-button').forEach(button => {
      button.classList.toggle('is-active', button.dataset.season === filter);
    });

    const query = state.pentadQuery.trim();
    const showingAllMatches = query.length > 0;
    const cards = $$('.pentad-card');
    const matched = cards.filter(card => {
      const seasonMatches = filter === 'all' || card.dataset.season === filter;
      const nameMatches = !showingAllMatches || (card.dataset.termName || '').includes(query);
      return seasonMatches && nameMatches;
    });
    const shownCount = showingAllMatches
      ? matched.length
      : Math.min(state.pentadVisibleCount, matched.length);
    const visibleCards = new Set(matched.slice(0, shownCount));

    cards.forEach(card => {
      card.hidden = !visibleCards.has(card);
    });

    const termCount = new Set(matched.map(card => card.dataset.termId)).size;
    const status = $('#pentadStatus');
    if (status) {
      status.textContent = showingAllMatches
        ? `“${query}”找到 ${termCount} 个节气 · ${matched.length} 条物候`
        : `已显示 ${shownCount} / ${matched.length} 条物候`;
    }

    const clearButton = $('#clearPentadSearch');
    if (clearButton) clearButton.hidden = !showingAllMatches;

    const loadZone = $('#pentadLoadZone');
    const remaining = matched.length - shownCount;
    if (loadZone) {
      loadZone.hidden = showingAllMatches || remaining <= 0;
      const loadTitle = $('#pentadLoadTitle');
      const loadText = $('#pentadLoadText');
      if (loadTitle) loadTitle.textContent = '继续下滑';
      if (loadText) loadText.textContent = remaining > 0
        ? `还有 ${remaining} 条，下滑或点击继续显示`
        : '全部物候已显示';
    }

    const empty = $('#pentadEmpty');
    if (empty) {
      empty.hidden = matched.length > 0;
      empty.textContent = showingAllMatches
        ? `没有找到节气“${query}”。搜索框只匹配节气名称，如“立春”“夏至”。`
        : '这个分类下暂时没有物候。';
    }
  }

  function loadMorePentads() {
    if (state.pentadQuery.trim()) return;
    state.pentadVisibleCount += PENTAD_PAGE_SIZE;
    applyPentadFilter(state.pentadFilter);
  }

  function maybeLoadMorePentads() {
    const zone = $('#pentadLoadZone');
    if (!state.pentadLoadArmed || !zone || zone.hidden) return;
    const rect = zone.getBoundingClientRect();
    const isNearViewport = rect.top <= window.innerHeight + 20 && rect.bottom >= 0;
    if (!isNearViewport) return;
    state.pentadLoadArmed = false;
    loadMorePentads();
  }

  function setupPentadObserver() {
    const zone = $('#pentadLoadZone');
    if (!zone || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) maybeLoadMorePentads();
    }, { rootMargin: '0px', threshold: 0.2 });
    observer.observe(zone);

    const armLoad = () => {
      state.pentadLoadArmed = true;
      window.requestAnimationFrame(maybeLoadMorePentads);
    };
    window.addEventListener('wheel', armLoad, { passive: true });
    window.addEventListener('touchmove', armLoad, { passive: true });
    window.addEventListener('keydown', event => {
      if (['PageDown', 'ArrowDown', ' ', 'Spacebar'].includes(event.key)) armLoad();
    });
  }

  function shuffle(items) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function makeOptions(correct, pool, count = 4) {
    const others = shuffle(pool.filter(item => item !== correct)).slice(0, count - 1);
    return shuffle([correct, ...others]);
  }

  function createDimensionStats() {
    return Object.fromEntries(Object.keys(DIMENSIONS).map(key => [key, { correct: 0, total: 0 }]));
  }

  function buildQuiz() {
    const termNames = TERMS.map(term => term.name);
    const pentadQuestions = shuffle(TERMS).slice(0, 4).map(term => {
      const pentad = term.pentads[Math.floor(Math.random() * term.pentads.length)];
      return {
        dimension: 'phenology',
        prompt: `“${pentad.name}”属于哪个节气？`,
        options: makeOptions(term.name, termNames),
        correct: term.name,
        explain: `“${pentad.name}”是${term.name}的三候之一：${pentad.note}`
      };
    });

    const astronomyBank = [
      {
        dimension: 'astronomy',
        prompt: '北半球白昼通常最长的是哪一个节气？',
        options: makeOptions('夏至', termNames),
        correct: '夏至',
        explain: '夏至时太阳直射北回归线，北半球白昼达到全年最长。'
      },
      {
        dimension: 'astronomy',
        prompt: '北半球白昼通常最短的是哪一个节气？',
        options: makeOptions('冬至', termNames),
        correct: '冬至',
        explain: '冬至时太阳直射南回归线，北半球白昼达到全年最短。'
      },
      {
        dimension: 'astronomy',
        prompt: '太阳视黄经为0°时，对应哪一个节气？',
        options: makeOptions('春分', termNames),
        correct: '春分',
        explain: '春分时太阳黄经为0°，太阳直射赤道，昼夜接近等长。'
      },
      {
        dimension: 'astronomy',
        prompt: '太阳视黄经为90°时，对应哪一个节气？',
        options: makeOptions('夏至', termNames),
        correct: '夏至',
        explain: '夏至的太阳视黄经为90°，太阳直射点位于北回归线附近。'
      },
      {
        dimension: 'astronomy',
        prompt: '太阳黄经每变化多少度，进入下一个节气？',
        options: ['10°', '15°', '20°', '30°'],
        correct: '15°',
        explain: '一个回归年约360°，分为二十四节气，每个节气对应太阳黄经变化15°。'
      },
      {
        dimension: 'astronomy',
        prompt: '太阳直射赤道、昼夜接近等长，最接近哪两个节气？',
        options: ['春分与秋分', '夏至与冬至', '立春与立秋', '小满与大暑'],
        correct: '春分与秋分',
        explain: '春分和秋分的太阳视黄经分别为0°和180°，太阳直射赤道附近。'
      }
    ];

    const phenologyBank = [
      {
        dimension: 'phenology',
        prompt: '按照传统物候体系，一个节气包含几候？',
        options: ['2候', '3候', '4候', '5候'],
        correct: '3候',
        explain: '五日为一候，三候为一个节气，二十四节气共对应七十二候。'
      },
      {
        dimension: 'phenology',
        prompt: '以下哪一项属于立春的初候？',
        options: makeOptions('东风解冻', ['东风解冻', '桃始华', '鹿角解', '水始冰']),
        correct: '东风解冻',
        explain: '立春三候为“东风解冻、蛰虫始振、鱼陟负冰”。'
      },
      {
        dimension: 'phenology',
        prompt: '“腐草为萤”被列在哪个节气的物候中？',
        options: makeOptions('大暑', termNames),
        correct: '大暑',
        explain: '“腐草为萤”是大暑初候，反映古人对萤火虫出现时节的观察与想象。'
      }
    ];

    const cultureBank = [
      {
        dimension: 'culture',
        prompt: '“清明时节雨纷纷”描写的是哪个节气？',
        options: makeOptions('清明', termNames),
        correct: '清明',
        explain: '这句诗出自杜牧《清明》，清明兼具节气与节日的文化属性。'
      },
      {
        dimension: 'culture',
        prompt: '“咬春”“打春牛”主要对应哪个节气？',
        options: makeOptions('立春', termNames),
        correct: '立春',
        explain: '立春有迎春、咬春、打春牛等传统习俗，表达对春耕和丰收的期盼。'
      },
      {
        dimension: 'culture',
        prompt: '冬至时节常见的“吃饺子、吃汤圆”属于哪类文化内容？',
        options: ['饮食习俗', '天文观测', '物候记录', '农具制作'],
        correct: '饮食习俗',
        explain: '不同地区在冬至形成吃饺子、汤圆等饮食传统，体现节气与日常生活的联系。'
      },
      {
        dimension: 'culture',
        prompt: '“雨生百谷”描述的是哪一个节气？',
        options: makeOptions('谷雨', termNames),
        correct: '谷雨',
        explain: '谷雨是春季最后一个节气，降水增多，适宜谷物生长。'
      }
    ];

    const pick = (pool, count) => shuffle(pool).slice(0, count);
    return shuffle([
      ...pick(astronomyBank, 3),
      ...pick([...phenologyBank, ...pentadQuestions], 3),
      ...pick(cultureBank, 2)
    ]);
  }

  function loadLearningProfile() {
    try {
      const profile = JSON.parse(localStorage.getItem(LEARNING_STORAGE_KEY) || 'null');
      if (!profile || !profile.dimensions) return null;
      return profile;
    } catch (error) {
      return null;
    }
  }

  function masteryRatio(stats) {
    if (!stats || !stats.total) return 0;
    return stats.correct / stats.total;
  }

  function masteryBarsHTML(dimensions) {
    return Object.entries(DIMENSIONS).map(([key, label]) => {
      const percent = Math.round(masteryRatio(dimensions[key]) * 100);
      return `
        <div class="mastery-row">
          <span>${label}</span>
          <div class="mastery-track"><i style="width:${percent}%"></i></div>
          <b>${percent}%</b>
        </div>`;
    }).join('');
  }

  function recommendationFor(dimensions) {
    const entries = Object.entries(DIMENSIONS)
      .filter(([key]) => dimensions[key]?.total)
      .map(([key, label]) => ({ key, label, ratio: masteryRatio(dimensions[key]) }))
      .sort((a, b) => a.ratio - b.ratio);
    if (!entries.length) return '完成一轮练习后，系统会根据答题情况给出复习建议。';
    if (entries[0].ratio >= 0.8) return '三个维度掌握较稳，可以进入观察手账，把知识转化为真实记录。';
    const advice = {
      astronomy: '回到节令盘，比较春分、夏至、秋分、冬至的太阳黄经与直射点。',
      phenology: '复习七十二候，重点观察同一节气三候之间的连续变化。',
      culture: '阅读节气详情中的农事、习俗与诗句，把名称和传统生活联系起来。'
    };
    return `建议先复习${entries[0].label}维度：${advice[entries[0].key]}`;
  }

  function renderLearningProfile(profile = state.learningProfile) {
    const wrap = $('#learningProfile');
    if (!wrap) return;
    if (!profile || !profile.dimensions) {
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;
    const date = $('#learningProfileDate');
    if (date) {
      date.textContent = profile.date
        ? new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(profile.date))
        : '';
    }
    const bars = $('#learningProfileBars');
    if (bars) bars.innerHTML = masteryBarsHTML(profile.dimensions);
    const recommendation = $('#learningRecommendation');
    if (recommendation) recommendation.textContent = profile.recommendation || recommendationFor(profile.dimensions);
  }

  function saveLearningProfile(quiz) {
    const profile = {
      date: new Date().toISOString(),
      score: quiz.score,
      total: quiz.questions.length,
      dimensions: JSON.parse(JSON.stringify(quiz.dimensions)),
      recommendation: recommendationFor(quiz.dimensions)
    };
    state.learningProfile = profile;
    renderLearningProfile(profile);
    try {
      localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(profile));
    } catch (error) {
      // The learning result still remains available for the current page visit.
    }
  }

  function startQuiz() {
    state.quiz = {
      questions: buildQuiz(),
      index: 0,
      score: 0,
      answered: false,
      selected: null,
      dimensions: createDimensionStats(),
      saved: false
    };
    renderQuiz();
  }

  function renderQuiz() {
    const body = $('#quizBody');
    const progress = $('#quizProgress');
    const feedback = $('#quizFeedback');
    const nextButton = $('#quizNextBtn');
    if (!state.quiz) return;
    const quiz = state.quiz;
    if (quiz.index >= quiz.questions.length) {
      if (!quiz.saved) {
        quiz.saved = true;
        saveLearningProfile(quiz);
      }
      const ratio = quiz.score / quiz.questions.length;
      let message = '再读一遍物候，你会发现时间留下的线索。';
      if (ratio >= 0.9) message = '你已经能用天文位置和物候变化解释节气了。';
      else if (ratio >= 0.7) message = '基础很稳，继续观察真实世界的变化。';
      progress.textContent = '完成';
      body.innerHTML = `
        <div class="quiz-result">
          <div class="quiz-result-inner">
            <div class="quiz-score">${quiz.score} / ${quiz.questions.length}</div>
            <p>${message}</p>
            <div class="quiz-mastery">
              <div class="card-label">本轮掌握度</div>
              ${masteryBarsHTML(quiz.dimensions)}
            </div>
            <p class="quiz-recommendation">${escapeHTML(recommendationFor(quiz.dimensions))}</p>
            <button class="button button-primary" type="button" id="quizRestartBtn">重新练习</button>
          </div>
        </div>`;
      feedback.textContent = '';
      nextButton.hidden = true;
      $('#quizRestartBtn')?.addEventListener('click', startQuiz);
      return;
    }
    const question = quiz.questions[quiz.index];
    progress.textContent = `${quiz.index + 1} / ${quiz.questions.length}`;
    feedback.textContent = '';
    nextButton.hidden = false;
    nextButton.disabled = !quiz.answered;
    nextButton.textContent = quiz.index === quiz.questions.length - 1 ? '查看成绩' : '下一题';
    body.innerHTML = `
      <p class="quiz-question">${escapeHTML(question.prompt)}</p>
      <div class="quiz-options">
        ${question.options.map((option, index) => `
          <button class="quiz-option" type="button" data-option="${escapeHTML(option)}"
            data-index="${index}" ${quiz.answered ? 'disabled' : ''}>${escapeHTML(option)}</button>`).join('')}
      </div>
      <p class="quiz-explain">${quiz.answered ? escapeHTML(question.explain) : ''}</p>`;
    if (quiz.answered) {
      $$('.quiz-option', body).forEach(button => {
        if (button.dataset.option === question.correct) button.classList.add('is-correct');
        if (button.dataset.option === quiz.selected && quiz.selected !== question.correct) {
          button.classList.add('is-wrong');
        }
      });
      feedback.textContent = quiz.selected === question.correct ? '回答正确' : `正确答案：${question.correct}`;
    }
  }

  function answerQuiz(option) {
    const quiz = state.quiz;
    if (!quiz || quiz.answered) return;
    const question = quiz.questions[quiz.index];
    quiz.answered = true;
    quiz.selected = option;
    const stats = quiz.dimensions[question.dimension];
    if (stats) stats.total += 1;
    if (option === question.correct) {
      quiz.score += 1;
      if (stats) stats.correct += 1;
    }
    renderQuiz();
  }

  function nextQuiz() {
    const quiz = state.quiz;
    if (!quiz || !quiz.answered) return;
    quiz.index += 1;
    quiz.answered = false;
    quiz.selected = null;
    renderQuiz();
  }
  function renderMyths() {
    const grid = $('#mythGrid');
    if (!grid) return;
    grid.innerHTML = (DATA.misconceptions || []).map((item, index) => `
      <button class="myth-card" type="button" data-myth-id="${item.id}"
        aria-expanded="false" aria-controls="myth-answer-${item.id}">
        <span class="myth-card-top">
          <span class="myth-tag">${escapeHTML(item.tag)}</span>
          <span class="myth-toggle">展开解释 +</span>
        </span>
        <span class="myth-question">${escapeHTML(item.myth)}</span>
        <span class="myth-answer" id="myth-answer-${item.id}">
          <span class="myth-answer-inner">
            <strong>${escapeHTML(item.truth)}</strong>
            <span>${escapeHTML(item.explain)}</span>
          </span>
        </span>
      </button>`).join('');
  }

  function toggleMythCard(card) {
    const shouldOpen = !card.classList.contains('is-open');
    $$('.myth-card').forEach(other => {
      other.classList.remove('is-open');
      other.setAttribute('aria-expanded', 'false');
      const toggle = $('.myth-toggle', other);
      if (toggle) toggle.textContent = '展开解释 +';
    });
    if (shouldOpen) {
      card.classList.add('is-open');
      card.setAttribute('aria-expanded', 'true');
      const toggle = $('.myth-toggle', card);
      if (toggle) toggle.textContent = '收起解释 −';
    }
  }

  function loadJournal() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  }

  function persistJournal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.journal.slice(0, 30)));
    } catch (error) {
      showToast('浏览器未允许本地保存，本条记录只在当前页面有效');
    }
  }

  function buildJournalSelect() {
    const select = $('#journalTerm');
    if (!select) return;
    select.innerHTML = TERMS.map(term => `<option value="${term.id}">${term.name} · ${SEASONS[term.season].label}季</option>`).join('');
  }

  function syncJournalTerm(termId) {
    const select = $('#journalTerm');
    if (!select) return;
    select.value = termId;
    renderJournalPentadChoices(termId);
    renderCardPreview();
  }

  function renderJournalPentadChoices(termId) {
    const container = $('#journalPentads');
    const term = termById.get(termId);
    if (!container || !term) return;
    container.innerHTML = term.pentads.map((pentad, index) => `
      <label class="pentad-check">
        <input type="checkbox" name="pentad" value="${escapeHTML(pentad.name)}" data-index="${index}">
        <span>${escapeHTML(pentad.name)}</span>
        <small>${['初候', '二候', '三候'][index]}</small>
      </label>`).join('');
  }

  function renderJournalEntries() {
    const container = $('#journalEntries');
    if (!container) return;
    if (!state.journal.length) {
      container.innerHTML = '<p class="empty-state">还没有观察记录。选一个节气，写下第一条吧。</p>';
      return;
    }
    container.innerHTML = state.journal.slice(0, 6).map(entry => {
      const term = termById.get(entry.termId);
      if (!term) return '';
      return `
        <article class="journal-entry">
          <div class="entry-term">${escapeHTML(term.name)}</div>
          <div class="entry-content">
            <span class="entry-time">${escapeHTML(formatDateTime(new Date(entry.createdAt)))}</span>
            <p>${escapeHTML(entry.note || '（未填写现场记录）')}</p>
            ${entry.pentads?.length ? `<div class="entry-pentads">${entry.pentads.map(item => `<span>${escapeHTML(item)}</span>`).join('')}</div>` : ''}
          </div>
        </article>`;
    }).join('');
  }

  function saveObservation(event) {
    event.preventDefault();
    const termId = $('#journalTerm').value;
    const term = termById.get(termId);
    const note = $('#journalNote').value.trim();
    const pentads = $$('#journalPentads input:checked').map(input => input.value);
    if (!term) return;
    if (!note && !pentads.length) {
      showToast('请至少勾选一候，或写下一条现场记录');
      $('#journalNote').focus();
      return;
    }
    state.journal.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      termId,
      note,
      pentads,
      createdAt: new Date().toISOString()
    });
    persistJournal();
    renderJournalEntries();
    showToast(`已保存${term.name}观察记录`);
  }

  function wrapCanvasText(ctx, text, maxWidth) {
    const lines = [];
    let line = '';
    Array.from(text).forEach(char => {
      const test = line + char;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = char;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function drawRoundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function renderCardPreview() {
    const canvas = $('#cardCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const term = termById.get(state.selectedTermId) || termById.get(state.currentTermId) || TERMS[0];
    const season = SEASONS[term.season];
    const note = ($('#journalNote')?.value || '').trim();
    const checked = $$('#journalPentads input:checked').map(input => input.value);
    const now = new Date();

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, term.palette.bg1);
    gradient.addColorStop(0.66, term.palette.bg2);
    gradient.addColorStop(1, term.palette.accent);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.13;
    ctx.strokeStyle = term.palette.deep;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(1040, 175, 310, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(1040, 175, 230, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(1040, 175, 150, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = term.palette.deep;
    ctx.font = '600 30px "Songti SC", "STSong", "SimSun", serif';
    ctx.fillText('时间之书', 92, 98);
    ctx.font = '500 14px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('TIMEBOOK · 24 SOLAR TERMS', 92, 128);
    ctx.letterSpacing = '0px';

    ctx.fillStyle = 'rgba(255,255,255,.54)';
    drawRoundedRect(ctx, 900, 74, 210, 54, 27);
    ctx.fill();
    ctx.fillStyle = term.palette.deep;
    ctx.font = '600 18px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${season.name} · 第${term.order + 1}节气`, 1005, 108);
    ctx.textAlign = 'left';

    ctx.fillStyle = term.palette.deep;
    ctx.font = '600 172px "Songti SC", "STSong", "SimSun", serif';
    ctx.fillText(term.name, 88, 340);
    ctx.font = '500 25px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.globalAlpha = 0.68;
    ctx.fillText(term.pinyin, 96, 383);
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(1010, 330);
    ctx.rotate(-Math.PI / 18);
    ctx.strokeStyle = term.palette.deep;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 96, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = term.palette.deep;
    ctx.font = '600 54px "Songti SC", "STSong", "SimSun", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(term.glyph, 0, 3);
    ctx.restore();

    ctx.strokeStyle = term.palette.deep;
    ctx.globalAlpha = 0.32;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(92, 442);
    ctx.lineTo(1108, 442);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const metrics = [
      ['太阳视黄经', `${term.longitude}°`],
      ['太阳直射点', formatDeclination(solarDeclinationFromLongitude(term.longitude, now))],
      ['交节时间', term.dateHint]
    ];
    metrics.forEach(([label, value], index) => {
      const x = 92 + index * 340;
      ctx.fillStyle = 'rgba(23,39,45,.52)';
      ctx.font = '500 16px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText(label, x, 494);
      ctx.fillStyle = term.palette.deep;
      ctx.font = '600 29px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText(value, x, 532);
    });

    ctx.fillStyle = 'rgba(23,39,45,.52)';
    ctx.font = '600 16px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('今日物候', 92, 630);
    ctx.strokeStyle = 'rgba(23,39,45,.25)';
    ctx.beginPath();
    ctx.moveTo(208, 623);
    ctx.lineTo(1108, 623);
    ctx.stroke();

    term.pentads.forEach((pentad, index) => {
      const y = 688 + index * 88;
      const active = !checked.length || checked.includes(pentad.name);
      ctx.globalAlpha = active ? 1 : 0.35;
      ctx.strokeStyle = term.palette.deep;
      ctx.lineWidth = 2;
      ctx.strokeRect(92, y - 20, 24, 24);
      if (active) {
        ctx.beginPath();
        ctx.moveTo(98, y - 8);
        ctx.lineTo(104, y - 1);
        ctx.lineTo(113, y - 14);
        ctx.stroke();
      }
      ctx.fillStyle = term.palette.deep;
      ctx.font = '600 17px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText(['初候', '二候', '三候'][index], 136, y);
      ctx.font = '600 25px "Songti SC", "STSong", "SimSun", serif';
      ctx.fillText(pentad.name, 208, y + 1);
      ctx.globalAlpha = 1;
    });

    ctx.fillStyle = 'rgba(255,255,255,.42)';
    drawRoundedRect(ctx, 74, 960, 1052, 300, 30);
    ctx.fill();
    ctx.strokeStyle = 'rgba(23,39,45,.18)';
    ctx.stroke();
    ctx.fillStyle = 'rgba(23,39,45,.52)';
    ctx.font = '600 16px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('我的观察记录', 112, 1012);
    ctx.fillStyle = term.palette.deep;
    ctx.font = '400 29px "PingFang SC", "Microsoft YaHei", sans-serif';
    const displayNote = note || '今天，我看见了时间在天空、风和草木之间留下的痕迹。';
    const lines = wrapCanvasText(ctx, displayNote, 950).slice(0, 5);
    lines.forEach((line, index) => ctx.fillText(line, 112, 1067 + index * 43));

    ctx.fillStyle = 'rgba(23,39,45,.52)';
    ctx.font = '600 15px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('节气诗句', 92, 1348);
    ctx.fillStyle = term.palette.deep;
    ctx.font = '500 36px "Songti SC", "STSong", "SimSun", serif';
    ctx.fillText(`“${term.poem.text}”`, 92, 1400);
    ctx.font = '400 18px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.globalAlpha = 0.64;
    ctx.fillText(`—— ${term.poem.author} ${term.poem.work}`, 92, 1442);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = term.palette.deep;
    ctx.globalAlpha = 0.24;
    ctx.beginPath();
    ctx.moveTo(92, 1502);
    ctx.lineTo(1108, 1502);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(23,39,45,.48)';
    ctx.font = '400 15px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(`观察时间 ${formatDateTime(now)}`, 92, 1542);
    ctx.textAlign = 'right';
    ctx.fillText('把时间，读成一本书。', 1108, 1542);
    ctx.textAlign = 'left';
  }

  function exportCard() {
    const canvas = $('#cardCanvas');
    const term = termById.get(state.selectedTermId) || TERMS[0];
    if (!canvas) return;
    renderCardPreview();
    canvas.toBlob(blob => {
      if (!blob) {
        showToast('节气卡生成失败，请重试');
        return;
      }
      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
      link.href = URL.createObjectURL(blob);
      link.download = `时间之书_${term.name}_${stamp}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1200);
      showToast('节气卡已导出');
    }, 'image/png');
  }

  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
  }

  function refreshNoteCount() {
    const note = $('#journalNote');
    const count = $('#noteCount');
    if (note && count) count.textContent = `${note.value.length} / 280`;
  }

  let previewFrame = 0;
  function schedulePreview() {
    window.cancelAnimationFrame(previewFrame);
    previewFrame = window.requestAnimationFrame(renderCardPreview);
  }

  function bindEvents() {
    $('#jumpTodayBtn')?.addEventListener('click', () => {
      selectTerm(state.currentTermId, { scroll: true });
    });
    $('#seasonFilter')?.addEventListener('click', event => {
      const button = event.target.closest('.season-button');
      if (button) applyPentadFilter(button.dataset.season, true);
    });
    $('#pentadSearch')?.addEventListener('input', event => {
      state.pentadQuery = event.target.value;
      state.pentadVisibleCount = PENTAD_PAGE_SIZE;
      applyPentadFilter(state.pentadFilter);
    });
    $('#clearPentadSearch')?.addEventListener('click', () => {
      const input = $('#pentadSearch');
      if (input) {
        input.value = '';
        input.focus();
      }
      state.pentadQuery = '';
      state.pentadVisibleCount = PENTAD_PAGE_SIZE;
      applyPentadFilter(state.pentadFilter);
    });
    $('#pentadLoadZone')?.addEventListener('click', loadMorePentads);
    $('#pentadGrid')?.addEventListener('click', event => {
      const card = event.target.closest('.pentad-card');
      if (card) selectTerm(card.dataset.termId, { scroll: true });
    });
    $('#journalTerm')?.addEventListener('change', event => {
      selectTerm(event.target.value, { syncJournal: false });
      renderJournalPentadChoices(event.target.value);
      renderCardPreview();
    });
    $('#journalPentads')?.addEventListener('change', renderCardPreview);
    $('#journalNote')?.addEventListener('input', () => {
      refreshNoteCount();
      schedulePreview();
    });
    $('#journalForm')?.addEventListener('submit', saveObservation);
    $('#exportCardBtn')?.addEventListener('click', exportCard);
    $('#clearJournalBtn')?.addEventListener('click', () => {
      if (!state.journal.length) return;
      if (window.confirm('确定清空全部观察记录吗？')) {
        state.journal = [];
        persistJournal();
        renderJournalEntries();
        showToast('观察记录已清空');
      }
    });
    $('#quizBody')?.addEventListener('click', event => {
      const button = event.target.closest('.quiz-option');
      if (button) answerQuiz(button.dataset.option);
    });
    $('#quizNextBtn')?.addEventListener('click', nextQuiz);
    $('#mythGrid')?.addEventListener('click', event => {
      const card = event.target.closest('.myth-card');
      if (card) toggleMythCard(card);
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshLive();
    });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      const hadController = Boolean(navigator.serviceWorker.controller);
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || refreshing) return;
        refreshing = true;
        window.location.reload();
      });
      navigator.serviceWorker.register('./sw.js').then(registration => registration.update()).catch(() => {});
    }
  }

  function init() {
    buildHeroOrbit();
    buildWheel();
    buildJournalSelect();
    bindEvents();
    refreshLive();
    setupPentadObserver();
    if (!state.selectedTermId) selectTerm(state.currentTermId);
    renderMyths();
    renderLearningProfile();
    startQuiz();
    renderJournalEntries();
    refreshNoteCount();
    renderCardPreview();
    registerServiceWorker();
    window.setInterval(refreshLive, 60000);
  }

  init();
})();
