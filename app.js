(() => {
  'use strict';

  /* ---------- Built-in settings and rules (same as the shared board) ---------- */
  const KEY = 'xbs-points-board-v2';
  const TYPES = {
    meeting: { label: 'Meeting', pts: 1 },
    event: { label: 'Event / Volunteer', pts: 2 },
    class: { label: 'Dhamma Class', pts: 5 },
    camp: { label: 'Camp', pts: 10 }
  };
  const ORDER = ['meeting', 'event', 'class', 'camp'];
  const LABEL = { full: 'Full marks', met: 'Target met', pace: 'On pace', behind: 'Behind', out: 'Out of reach' };
  const NAMES = [
    'Jacqueline', 'Ling Bei Zu', 'Chia Xing Teng', 'Tan Yan Ying', 'Lum Phui Yee',
    'Foo Ten Zin', 'Julian', 'JY', 'Wilbert', 'Thien Yee Kei',
    'Mei Kang Ying', 'Tan Xin Yee', 'Goh Ying Hang', 'Koong Li Yan', 'Tan Yi Qi',
    'Sin Xin Yu', 'Chan Ying Ru', 'Soon Ke Han', 'Yap Xin Huey', 'Chin Xin Ying'
  ];
  const PRESIDENT_TEAM = ['Jacqueline', 'Ling Bei Zu', 'Chia Xing Teng'];
  const DEFAULTS = {
    semester: 'Semester 1 · 2026/27',
    start: '2026-10-29',
    end: '2026-12-23',
    target: 12,
    presidentRule: true,
    plan: { meeting: 4, event: 3, class: 2, camp: 1 },
    next: { type: 'class', date: '', title: '' },
    handle: '@xmum_buddhist_society',
    pin: '1234'
  };
  // Original Chinese text of the Dhammapada (法句经, T210) as printed on Wikisource. Punctuation added.
  const VERSES = [
    { ref: '双要品第九', t: '心为法本，心尊心使，中心念善，即言即行，福乐自追，如影随形。' },
    { ref: '恶行品第十七', t: '莫轻小善，以为无福，水滴虽微，渐盈大器，凡福充满，从纤纤积。' },
    { ref: '放逸品第十', t: '戒为甘露道，放逸为死径，不贪则不死，失道为自丧。' },
    { ref: '多闻品第三', t: '多闻能持固，奉法为垣墙，精进难踰毁，从是戒慧成。' },
    { ref: '笃信品第四', t: '信能度渊，摄为船师，精进除苦，慧到彼岸。' },
    { ref: '爱身品第二十', t: '学先自正，然后正人，调身入慧，必迁为上。' },
    { ref: '道行品第二十八', t: '慎言守意念，身不善不行，如是三行除，佛说是得道。' },
    { ref: '戒慎品第五', t: '人而常清，奉律至终，净修善行，如是戒成。' },
    { ref: '教学品第二', t: '正见学务增，是为世间明，所生福千倍，终不堕恶道。' },
    { ref: '多闻品第三', t: '闻为今世利，妻子昆弟友，亦致后世福，积闻成圣智。' }
  ];

  /* ---------- Helpers ---------- */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const todayD = () => parse(iso(new Date()));
  const dayDiff = (a, b) => Math.round((b - a) / 864e5);
  const fmt = (s, o) => { const d = parse(s); return d ? d.toLocaleDateString('en-GB', o || { day: '2-digit', month: 'short', year: 'numeric' }) : ''; };
  const uid = () => Math.random().toString(36).slice(2, 10);
  // Display name: drop the family name (first word) when there are three or more words.
  const shortName = (full) => { const w = String(full || '').trim().split(/\s+/); return w.length >= 3 ? w.slice(1).join(' ') : w.join(' '); };
  const initials = (s) => { const w = String(s || '?').trim().split(/\s+/); return (w.length > 1 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase(); };
  const pts = (t) => (TYPES[t] ? TYPES[t].pts : 0);
  const typeLabel = (t) => (TYPES[t] ? TYPES[t].label : 'Session');
  const stat = (sel, val, of) => { $(sel).innerHTML = val + (of ? '<em>/' + of + '</em>' : ''); };
  const num = (sel) => Math.max(0, parseInt($(sel).value, 10) || 0);

  /* ---------- Data (saved in this browser) ---------- */
  function freshState() {
    return {
      settings: { ...DEFAULTS, plan: { ...DEFAULTS.plan }, next: { ...DEFAULTS.next } },
      members: NAMES.map((name, i) => ({ id: 'm' + (i + 1), name, short: shortName(name), role: PRESIDENT_TEAM.includes(name) ? 'president' : 'committee' })),
      sessions: [],
      posted: {}
    };
  }
  // Data saved by the first version: move the old default handle and semester dates to the current ones.
  function migrate(x) {
    if (x.handle === '@xmum_buddhist-society') x.handle = DEFAULTS.handle;
    if (x.start === '2026-09-01' && x.end === '2027-02-28') {
      x.start = DEFAULTS.start;
      x.end = DEFAULTS.end;
    }
    return x;
  }
  function normalize(o) {
    const d = freshState();
    const s = (o && o.settings) || {};
    return {
      settings: migrate({ ...d.settings, ...s, plan: { ...d.settings.plan, ...(s.plan || {}) }, next: { ...d.settings.next, ...(s.next || {}) } }),
      members: Array.isArray(o && o.members) ? o.members : d.members,
      sessions: Array.isArray(o && o.sessions) ? o.sessions : [],
      posted: o && o.posted && typeof o.posted === 'object' ? o.posted : {}
    };
  }
  function readStore() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }
  let S = normalize(readStore());
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { toast('This browser cannot save data. Export a backup file now.'); }
  }
  let sortMode = 'points';
  let tab = 'record';
  let unlocked = false;
  try { unlocked = sessionStorage.getItem('xbs-points-unlocked') === '1'; } catch (e) { /* storage blocked: stay locked */ }
  function blankDraft() {
    return { type: 'meeting', date: iso(new Date()), title: '', att: new Set(), edit: null };
  }
  let draft = blankDraft();

  /* ---------- Rules ---------- */
  const target = () => Math.max(1, parseInt(S.settings.target, 10) || 12);
  const sessionsSorted = () => S.sessions.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.created || 0) - (b.created || 0)));
  const earned = (id) => S.sessions.reduce((n, s) => n + (s.att.includes(id) ? pts(s.type) : 0), 0);
  const heldPts = () => S.sessions.reduce((n, s) => n + pts(s.type), 0);
  const plannedSessions = () => ORDER.reduce((n, t) => n + (parseInt(S.settings.plan[t], 10) || 0), 0);
  const plannedPts = () => ORDER.reduce((n, t) => n + (parseInt(S.settings.plan[t], 10) || 0) * pts(t), 0);
  const maxPts = () => Math.max(plannedPts(), heldPts());
  const leftPts = () => Math.max(0, maxPts() - heldPts());
  const streakOf = (id) => {
    const list = sessionsSorted();
    let n = 0;
    for (let i = list.length - 1; i >= 0 && list[i].att.includes(id); i--) n++;
    return n;
  };
  function semester() {
    const s = parse(S.settings.start), e = parse(S.settings.end), t = todayD();
    if (!s || !e || e <= s) return { frac: 0, days: null, week: 0, weeks: 0 };
    const total = dayDiff(s, e);
    const passed = Math.min(total, Math.max(0, dayDiff(s, t)));
    return { frac: passed / total, days: Math.max(0, dayDiff(t, e)), week: Math.floor(passed / 7) + 1, weeks: Math.ceil(total / 7) };
  }
  // One row per member: points, status and the flags every panel uses.
  function infos() {
    const t = target(), max = maxPts(), left = leftPts(), floorPace = Math.floor(t * semester().frac);
    return S.members.map((m) => {
      const p = earned(m.id);
      const isPres = m.role === 'president';
      const maxed = p > 0 && p >= max;
      let status;
      if (p >= t) status = maxed ? 'full' : 'met';
      else if (p + left < t) status = 'out';
      else if (p < floorPace) status = 'behind';
      else status = 'pace';
      return { m, p, status, isPres, maxed, below: p < t, subject: !isPres || S.settings.presidentRule, streak: streakOf(m.id) };
    });
  }
  const owedList = () => infos().filter((i) => i.subject && i.below && !S.posted[i.m.id]);
  const rewardList = () => infos().filter((i) => i.maxed && !i.isPres);

  /* ---------- Text ---------- */
  function verse() {
    const d = todayD();
    return VERSES[dayDiff(new Date(d.getFullYear(), 0, 0), d) % VERSES.length];
  }
  function nextText() {
    const n = S.settings.next || {};
    const d = parse(n.date);
    if (!d) return 'Not set';
    const gap = dayDiff(todayD(), d);
    const when = gap < 0 ? 'passed' : gap === 0 ? 'today' : gap === 1 ? 'tomorrow' : 'in ' + gap + ' days';
    return typeLabel(n.type) + ' · ' + when;
  }
  function caption() {
    return ['《法句经》', '「[the verse I remember most]」', '', 'My reflection: [my own thoughts]', '', S.settings.handle].join('\n');
  }
  function verseCopy(v) {
    return '《法句经》「' + v.t + '」（' + v.ref + '）';
  }
  function reminderText() {
    const n = S.settings.next || {};
    const next = parse(n.date) ? typeLabel(n.type) + ' on ' + fmt(n.date) : 'to be confirmed';
    return [
      'XBS Points · ' + S.settings.semester,
      'Target: ' + target() + ' points by the end of the semester.',
      'Next: ' + next + (n.title ? ' · ' + n.title : '') + '.',
      'Check your points on the board. See you there.'
    ].join('\n');
  }
  function backupText() {
    return JSON.stringify(S, null, 2);
  }

  /* ---------- Feedback and confirmations ---------- */
  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }
  async function copyText(text) {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove();
    }
    toast(ok ? 'Copied' : 'Copy failed. Select the text yourself.');
  }
  let pendingAnswer = null;
  function ask(msg, yes) {
    return new Promise((resolve) => {
      $('#sheetMsg').textContent = msg;
      $('#sheetYes').textContent = yes || 'Yes';
      $('#sheet').hidden = false;
      pendingAnswer = resolve;
      $('#sheetYes').focus();
    });
  }
  function answer(v) {
    $('#sheet').hidden = true;
    const done = pendingAnswer;
    pendingAnswer = null;
    if (done) done(v);
  }

  /* ---------- Board (everyone) ---------- */
  function ringSVG(p, t) {
    const pct = Math.min(100, Math.round((p / t) * 100));
    return '<svg viewBox="0 0 36 36" aria-hidden="true"><circle class="trk" cx="18" cy="18" r="15.9"/><circle class="val" cx="18" cy="18" r="15.9" pathLength="100" stroke-dasharray="' + pct + ' 100"/></svg>';
  }
  function nameChips(list, empty, cls) {
    if (!list.length) return '<li class="empty">' + empty + '</li>';
    return list.map((i) => '<li class="chip-name ' + cls + '">' + esc(i.m.short) + '<small>' + i.p + ' / ' + target() + '</small></li>').join('');
  }
  function renderMembers(all) {
    const grid = $('#memberGrid');
    if (!S.members.length) {
      grid.innerHTML = '<p class="empty" style="padding:28px 16px">No members yet. Add them in Admin, Members.</p>';
      return;
    }
    const t = target();
    const list = all.slice().sort((a, b) => (sortMode === 'name'
      ? a.m.short.localeCompare(b.m.short)
      : (b.p - a.p) || a.m.short.localeCompare(b.m.short)));
    grid.innerHTML = list.map((i, idx) => `
      <article class="card st-${i.status}" style="--i:${idx}" title="${esc(i.m.name)}">
        ${sortMode === 'points' ? `<span class="rank">${pad(idx + 1)}</span>` : ''}
        ${i.isPres ? '<span class="role">Role model</span>' : ''}
        <div class="ring">${ringSVG(i.p, t)}<span class="ini">${esc(initials(i.m.short))}</span></div>
        <h3>${esc(i.m.short)}</h3>
        <p class="pts"><b>${i.p}</b> / ${t} pts</p>
        <span class="chip">${LABEL[i.status]}</span>
        <p class="streak">${i.streak > 1 ? 'Streak ' + i.streak : ''}</p>
      </article>`).join('');
  }
  function renderAttendance(all) {
    const el = $('#attend');
    const ss = sessionsSorted();
    if (!ss.length) {
      el.innerHTML = '<p class="empty">No sessions yet. Record the first one in Admin.</p>';
      return;
    }
    const rows = all.slice().sort((a, b) => a.m.short.localeCompare(b.m.short));
    const head = ss.map((s) => `<th title="${esc(typeLabel(s.type) + (s.title ? ' · ' + s.title : ''))}"><span>${esc(fmt(s.date, { day: '2-digit', month: 'short' }))}</span></th>`).join('');
    const body = rows.map((r) => `
      <tr><th scope="row">${esc(r.m.short)}</th>${ss.map((s) => `<td><i class="${s.type}${s.att.includes(r.m.id) ? ' on' : ''}" title="${esc(r.m.short + ' · ' + typeLabel(s.type))}"></i></td>`).join('')}<td class="tot">${r.p}</td></tr>`).join('');
    el.innerHTML = `<table class="att"><thead><tr><th></th>${head}<th class="tot">Pts</th></tr></thead><tbody>${body}</tbody></table>`;
  }
  function renderRecent() {
    const ss = sessionsSorted().reverse().slice(0, 6);
    $('#recent').innerHTML = ss.length ? ss.map((s) => `
      <li>
        <time>${esc(fmt(s.date))}</time>
        <div class="t">${esc(s.title || typeLabel(s.type))}<small>${esc(typeLabel(s.type))} · +${pts(s.type)} pts each</small></div>
        <span class="n">${s.att.length} ${s.att.length === 1 ? 'person' : 'people'}</span>
      </li>`).join('') : '<li class="empty">No sessions yet.</li>';
  }
  function renderBoard() {
    const sem = semester(), t = target(), v = verse();
    const all = infos();
    $('#semName').textContent = S.settings.semester;
    $('#lede').textContent = 'Show up. Keep your count. Target: ' + t + ' points this semester.';
    $('#fDays').textContent = sem.days == null ? '--' : sem.days;
    $('#fLeft').textContent = leftPts();
    $('#fNext').textContent = nextText();
    $('#semFill').style.width = (sem.frac * 100).toFixed(1) + '%';
    $('#weekTxt').textContent = sem.weeks ? 'Week ' + sem.week + ' of ' + sem.weeks : 'Set the semester dates in Settings';
    $('#verseTxt').textContent = '「' + v.t + '」';
    $('#verseRef').textContent = '法句经 · ' + v.ref;
    stat('#sSess', S.sessions.length, plannedSessions() || null);
    stat('#sMet', all.filter((i) => i.p >= t).length, all.length || null);
    stat('#sFull', rewardList().length, null);
    stat('#sLeft', Math.max(0, plannedSessions() - S.sessions.length), null);
    $('#sortBtn').textContent = sortMode === 'name' ? 'Sort by points' : 'Sort by name';
    $('#memHint').textContent = 'Gold ring = target met. Sorted by ' + (sortMode === 'name' ? 'name' : 'points') + '.';
    $('#rewHint').textContent = 'Full marks at semester end. President Team is not in the race.';
    $('#rewBoard').innerHTML = nameChips(rewardList(), 'No full marks yet.', 'gold');
    renderMembers(all);
    renderAttendance(all);
    renderRecent();
  }

  /* ---------- Admin: record a session ---------- */
  function visibleIds() {
    const q = ($('#fFind').value || '').trim().toLowerCase();
    return S.members.filter((m) => !q || (m.short + ' ' + m.name).toLowerCase().includes(q)).map((m) => m.id);
  }
  function pickSummary() {
    const n = draft.att.size, p = pts(draft.type);
    $('#fSum').textContent = n ? n + ' selected · +' + p + ' pts each · +' + (n * p) + ' pts in total' : 'Tick the people who came.';
  }
  function renderPick() {
    const ids = new Set(visibleIds());
    const rows = S.members.filter((m) => ids.has(m.id)).map((m) => `
      <label class="pick"><input type="checkbox" value="${m.id}"${draft.att.has(m.id) ? ' checked' : ''}><span title="${esc(m.name)}">${esc(m.short)}</span></label>`).join('');
    $('#pickList').innerHTML = rows || '<p class="empty" style="padding:14px">No match.</p>';
    pickSummary();
  }
  function renderRecord() {
    $('#typeBtns').innerHTML = ORDER.map((t) => `<button type="button" data-type="${t}" aria-pressed="${draft.type === t}"><b>${esc(TYPES[t].label)}</b><small>+${TYPES[t].pts} pts each</small></button>`).join('');
    $('#fDate').value = draft.date;
    $('#fTitle').value = draft.title;
    $('#fSave').textContent = draft.edit ? 'Update session' : 'Save and add points';
    $('#fCancel').hidden = !draft.edit;
    renderPick();
  }
  function saveDraft() {
    if (!parse(draft.date)) return toast('Pick a date first');
    if (!draft.att.size) return toast('Tick at least one name');
    const old = draft.edit ? S.sessions.find((s) => s.id === draft.edit) : null;
    const row = {
      id: old ? old.id : uid(),
      type: draft.type,
      date: draft.date,
      title: draft.title.trim(),
      att: [...draft.att],
      created: old ? old.created : Date.now()
    };
    if (old) Object.assign(old, row);
    else S.sessions.push(row);
    save();
    if (old) toast('Session updated');
    else toast('Saved · +' + pts(row.type) + ' pts for ' + row.att.length + (row.att.length === 1 ? ' person' : ' people'));
    draft = { ...blankDraft(), type: row.type, date: row.date };
    renderAll();
  }

  /* ---------- Admin: sessions ---------- */
  function renderSessions() {
    const list = S.sessions.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.created || 0) - (a.created || 0)));
    $('#sessList').innerHTML = list.length ? list.map((s) => `
      <li>
        <time>${esc(fmt(s.date))}</time>
        <div class="t">${esc(s.title || typeLabel(s.type))}<small>${esc(typeLabel(s.type))} · ${s.att.length} ${s.att.length === 1 ? 'person' : 'people'}</small></div>
        <span class="acts"><button class="ghost" type="button" data-edit="${s.id}">Edit</button><button class="ghost danger" type="button" data-del="${s.id}">Delete</button></span>
      </li>`).join('') : '<li class="empty">No sessions yet.</li>';
  }
  function sessionAction(e) {
    const ed = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-del]');
    if (ed) {
      const s = S.sessions.find((x) => x.id === ed.dataset.edit);
      if (!s) return;
      draft = { type: s.type, date: s.date, title: s.title || '', att: new Set(s.att), edit: s.id };
      return setTab('record');
    }
    if (del) deleteSession(del.dataset.del);
  }
  async function deleteSession(id) {
    if (!(await ask('Delete this session? Its points come off the board.', 'Delete'))) return;
    S.sessions = S.sessions.filter((s) => s.id !== id);
    save();
    toast('Session deleted');
    renderAll();
  }

  /* ---------- Admin: members ---------- */
  function renderMembersAdmin() {
    $('#memList').innerHTML = S.members.map((m) => `
      <div class="mrow" data-mid="${m.id}">
        <input data-f="name" value="${esc(m.name)}" aria-label="Full name">
        <input data-f="short" value="${esc(m.short)}" aria-label="Short name shown on the board">
        <select data-f="role" aria-label="Role">
          <option value="committee"${m.role === 'president' ? '' : ' selected'}>Committee</option>
          <option value="president"${m.role === 'president' ? ' selected' : ''}>President Team</option>
        </select>
        <button class="ghost danger" type="button" data-remove>Remove</button>
      </div>`).join('') || '<p class="empty">No members yet.</p>';
  }
  function memberEdit(e) {
    const row = e.target.closest('[data-mid]');
    const f = e.target.dataset.f;
    const m = row ? S.members.find((x) => x.id === row.dataset.mid) : null;
    if (!m || !f) return;
    const v = e.target.value.trim();
    if (f === 'name') {
      if (!v) {
        toast('Name cannot be empty');
        return renderAll();
      }
      m.name = v.replace(/\s+/g, ' ');
      m.short = shortName(m.name);
    }
    if (f === 'short') m.short = v || shortName(m.name);
    if (f === 'role') m.role = v === 'president' ? 'president' : 'committee';
    save();
    toast('Saved');
    renderAll();
  }
  function addMember() {
    const name = $('#mAdd').value.trim().replace(/\s+/g, ' ');
    if (!name) return toast('Type a full name first');
    if (S.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) return toast('That name is already in');
    S.members.push({ id: 'm' + uid(), name, short: shortName(name), role: 'committee' });
    $('#mAdd').value = '';
    save();
    toast('Member added');
    renderAll();
  }
  async function removeMember(id) {
    const m = S.members.find((x) => x.id === id);
    if (!m || !(await ask('Remove ' + m.name + ' from the board? Past attendance stays in old sessions.', 'Remove'))) return;
    S.members = S.members.filter((x) => x.id !== id);
    save();
    toast('Member removed');
    renderAll();
  }

  /* ---------- Admin: IG post and full attendance ---------- */
  function renderPenAdmin() {
    const t = target();
    $('#penAdminHint').textContent = 'Under ' + t + ' points and not yet posted. Post your verse and reflection on IG, tag ' + S.settings.handle + ', then tick here.';
    const owed = owedList();
    $('#penAdmin').innerHTML = owed.length ? owed.map((i) => `
      <li class="row">
        <span class="nm">${esc(i.m.short)}</span>
        <span class="pp">${i.p} / ${t} pts</span>
        <label class="tick"><input type="checkbox" data-post="${i.m.id}"> Posted</label>
        <button class="ghost" type="button" data-cap>Copy text</button>
      </li>`).join('') : '<li class="empty">No IG posts owed.</li>';
    $('#rewAdmin').innerHTML = nameChips(rewardList(), 'No full marks yet.', 'gold');
    $('#verseBank').innerHTML = VERSES.map((v, i) => `
      <li>
        <p class="zh" lang="zh">「${esc(v.t)}」</p>
        <div class="vmeta"><span>法句经 · ${esc(v.ref)}</span><button class="ghost" type="button" data-copyverse="${i}">Copy verse</button></div>
      </li>`).join('');
  }
  function penaltyTick(e) {
    if (!e.target.matches('[data-post]')) return;
    const id = e.target.dataset.post;
    if (e.target.checked) S.posted[id] = iso(new Date());
    else delete S.posted[id];
    save();
    toast(e.target.checked ? 'Marked as posted' : 'Tick removed');
    renderAll();
  }

  /* ---------- Admin: settings and tools ---------- */
  function renderSettings() {
    const s = S.settings, p = s.plan;
    $('#sName').value = s.semester;
    $('#sTarget').value = s.target;
    $('#sStart').value = s.start;
    $('#sEnd').value = s.end;
    $('#sHandle').value = s.handle;
    $('#sPres').checked = !!s.presidentRule;
    $('#pMeeting').value = p.meeting;
    $('#pEvent').value = p.event;
    $('#pClass').value = p.class;
    $('#pCamp').value = p.camp;
    $('#nType').innerHTML = ORDER.map((t) => `<option value="${t}"${s.next.type === t ? ' selected' : ''}>${esc(TYPES[t].label)}</option>`).join('');
    $('#nDate').value = s.next.date || '';
    $('#nTitle').value = s.next.title || '';
    $('#sPin').value = '';
    $('#planSum').textContent = 'Full marks = ' + plannedPts() + ' pts from ' + plannedSessions() + ' planned sessions.';
  }
  function saveSettings() {
    const start = $('#sStart').value, end = $('#sEnd').value;
    if (!parse(start) || !parse(end) || parse(end) <= parse(start)) return toast('Check the start and end dates');
    const t = parseInt($('#sTarget').value, 10);
    if (!(t > 0)) return toast('Target must be 1 or more');
    const pin = $('#sPin').value.trim();
    if (pin && !/^\d{4,8}$/.test(pin)) return toast('PIN needs 4 to 8 digits');
    const s = S.settings;
    s.semester = $('#sName').value.trim() || s.semester;
    s.start = start;
    s.end = end;
    s.target = t;
    s.handle = $('#sHandle').value.trim() || DEFAULTS.handle;
    s.presidentRule = $('#sPres').checked;
    s.plan = { meeting: num('#pMeeting'), event: num('#pEvent'), class: num('#pClass'), camp: num('#pCamp') };
    s.next = { type: $('#nType').value, date: $('#nDate').value, title: $('#nTitle').value.trim() };
    if (pin) s.pin = pin;
    save();
    toast('Settings saved');
    renderAll();
  }
  async function newSemester() {
    if (!(await ask('Start a new semester? All sessions and IG ticks are deleted. Members stay. Export a backup first.', 'Start new'))) return;
    S.sessions = [];
    S.posted = {};
    save();
    toast('New semester started. Update the dates in Settings.');
    renderAll();
  }
  function exportBackup() {
    const blob = new Blob([backupText()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'xbs-points-backup-' + iso(new Date()) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast('Backup file downloaded');
  }
  function importBackup(file) {
    const r = new FileReader();
    r.onload = async () => {
      let data = null;
      try { data = JSON.parse(r.result); } catch (e) { data = null; }
      if (!data || !Array.isArray(data.members)) return toast('That file is not a backup');
      if (!(await ask('Replace all current data with this backup?', 'Replace'))) return;
      S = normalize(data);
      save();
      toast('Backup loaded');
      renderAll();
    };
    r.readAsText(file);
  }

  /* ---------- Views, tabs and PIN ---------- */
  function renderAdmin() {
    $('#gate').hidden = unlocked;
    $('#adminBody').hidden = !unlocked;
    if (!unlocked) return;
    $$('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    $$('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== tab; });
    if (tab === 'record') renderRecord();
    if (tab === 'sessions') renderSessions();
    if (tab === 'members') renderMembersAdmin();
    if (tab === 'penalty') renderPenAdmin();
    if (tab === 'settings') renderSettings();
  }
  function setTab(t) {
    tab = t;
    renderAdmin();
  }
  function renderAll() {
    renderBoard();
    if (!$('#view-admin').hidden) renderAdmin();
  }
  function setView(v) {
    $$('[data-view]').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
    $('#view-board').hidden = v !== 'board';
    $('#view-admin').hidden = v !== 'admin';
    if (v === 'admin') renderAdmin();
    window.scrollTo(0, 0);
  }
  function unlock(e) {
    e.preventDefault();
    const ok = $('#pinIn').value.trim() === S.settings.pin;
    $('#pinIn').value = '';
    if (!ok) return toast('Wrong PIN');
    unlocked = true;
    try { sessionStorage.setItem('xbs-points-unlocked', '1'); } catch (err) { /* ignore */ }
    renderAdmin();
  }
  function lock() {
    unlocked = false;
    try { sessionStorage.removeItem('xbs-points-unlocked'); } catch (e) { /* ignore */ }
    setView('board');
  }

  /* ---------- Wiring ---------- */
  $$('[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  $$('[data-tab]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
  $('#sortBtn').addEventListener('click', () => { sortMode = sortMode === 'points' ? 'name' : 'points'; renderBoard(); });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-cap]')) return copyText(caption());
    const cv = e.target.closest('[data-copyverse]');
    if (cv) return copyText(verseCopy(VERSES[Number(cv.dataset.copyverse)]));
    const rm = e.target.closest('[data-remove]');
    if (rm) return removeMember(rm.closest('[data-mid]').dataset.mid);
  });

  $('#gateForm').addEventListener('submit', unlock);
  $('#lockBtn').addEventListener('click', lock);

  $('#typeBtns').addEventListener('click', (e) => {
    const b = e.target.closest('[data-type]');
    if (!b) return;
    draft.type = b.dataset.type;
    renderRecord();
  });
  $('#fDate').addEventListener('change', (e) => { if (parse(e.target.value)) draft.date = e.target.value; });
  $('#fTitle').addEventListener('input', (e) => { draft.title = e.target.value; });
  $('#fFind').addEventListener('input', renderPick);
  $('#pickList').addEventListener('change', (e) => {
    if (!e.target.matches('input[type="checkbox"]')) return;
    if (e.target.checked) draft.att.add(e.target.value);
    else draft.att.delete(e.target.value);
    pickSummary();
  });
  $('#fAll').addEventListener('click', () => { visibleIds().forEach((id) => draft.att.add(id)); renderPick(); });
  $('#fNone').addEventListener('click', () => { draft.att.clear(); renderPick(); });
  $('#fSave').addEventListener('click', saveDraft);
  $('#fCancel').addEventListener('click', () => { draft = blankDraft(); renderRecord(); });

  $('#sessList').addEventListener('click', sessionAction);
  $('#memList').addEventListener('change', memberEdit);
  $('#mAdd').addEventListener('keydown', (e) => { if (e.key === 'Enter') addMember(); });
  $('#mAddBtn').addEventListener('click', addMember);
  $('#penAdmin').addEventListener('change', penaltyTick);

  $('#setSave').addEventListener('click', saveSettings);
  $('#exportBtn').addEventListener('click', exportBackup);
  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (f) importBackup(f);
  });
  $('#cpBackup').addEventListener('click', () => copyText(backupText()));
  $('#cpReminder').addEventListener('click', () => copyText(reminderText()));
  $('#newSem').addEventListener('click', newSemester);
  $('#sheetYes').addEventListener('click', () => answer(true));
  $('#sheetNo').addEventListener('click', () => answer(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pendingAnswer) answer(false); });

  /* ---------- Start ---------- */
  save();
  renderAll();
  setView('board');
})();
