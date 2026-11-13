// Wesenbuch: browsing, detail pages, episodes and the personal checklist.
// (build.py puts data.js and the sketch table SKETCHES in front of this file.)

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const native = window.WesenApp || null;

for (const w of WESEN) { w.id = slug(w.n.replace(/\s*\(.*\)/, '')); w.t ||= 'w'; }
const byId = Object.fromEntries(WESEN.map(w => [w.id, w]));
const TYPE = { w: 'Wesen', o: 'Not a Wesen', m: 'Only mentioned' };

// ───────── per-viewer state: seen, favourites, filters, theme ─────────
const KEY = 'wesenbuch.v1';
let ST = {};
try { ST = JSON.parse(localStorage.getItem(KEY)) || {}; } catch {}
ST.seen ||= {}; ST.fav ||= {}; ST.f ||= { q: '', season: '', cat: '', sort: 'az', others: true };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch {} };

// ───────── the pencil sketch ─────────
function sketch(key, cls = 'sk') {
  const s = SKETCHES[key];
  if (!s) return '';
  const rule = s.r ? ` fill-rule="${s.r}"` : '';
  return `<svg class="${cls}" viewBox="-24 -24 560 560" role="img" aria-label="Pencil sketch of ${esc(s.cap)}">
    <g filter="url(#rough)"><path d="${s.d}"${rule} fill="url(#hatch1)" opacity=".7"/><path d="${s.d}"${rule} fill="url(#hatch2)" mask="url(#lowerright)" opacity=".8"/>
    <path d="${s.d}" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/></g>
    <g filter="url(#rough2)" opacity=".5"><path d="${s.d}" fill="none" stroke="currentColor" stroke-width="2.4" transform="translate(4 3)"/></g></svg>`;
}

// ───────── episodes ─────────
function epInfo(ep) {
  const { season, episode } = seasonOf(ep);
  const [title, date] = EPISODES[ep - 1];
  return { ep, season, episode, title, date, code: `S${season} · E${episode}` };
}
function fmtDate(iso) { return new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
const debuts = {};   // overall episode -> creatures that first appear there
for (const w of WESEN) for (const e of [w.ep, ...(w.also || [])]) (debuts[e] ||= []).push(w);

// ───────── tabs ─────────
let tab = 'book';
document.querySelectorAll('nav [data-tab]').forEach(b => b.onclick = () => go(b.dataset.tab));
function go(t, push = true) {
  tab = t;
  document.querySelectorAll('nav [data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
  if (push) location.hash = t === 'book' ? '' : '#/' + t;
  render();
  scrollTo(0, 0);
}
function render() { ({ book: renderBook, eps: renderEpisodes, mine: renderMine })[tab](); }

// ───────── the bestiary ─────────
function filtered() {
  const f = ST.f, q = f.q.trim().toLowerCase();
  let l = WESEN.filter(w => (f.others || w.t === 'w')
    && (!f.season || seasonOf(w.ep).season === +f.season)
    && (!f.cat || w.c === f.cat)
    && (!q || (w.n + ' ' + (w.m || '') + ' ' + w.d + ' ' + (w.k || '') + ' ' + SKETCHES[w.s]?.cap).toLowerCase().includes(q)));
  if (f.sort === 'ep') l.sort((a, b) => a.ep - b.ep || a.n.localeCompare(b.n));
  else l.sort((a, b) => a.n.localeCompare(b.n, 'de'));
  return l;
}
function renderBook() {
  const f = ST.f;
  $('#main').innerHTML = `
    <div class="controls">
      <input type="search" id="q" placeholder="Search names, animals, behaviour…" value="${esc(f.q)}" aria-label="Search">
      <select id="season" aria-label="First appeared in"><option value="">All seasons</option>${[1, 2, 3, 4, 5, 6].map(s => `<option value="${s}" ${+f.season === s ? 'selected' : ''}>Season ${s}</option>`).join('')}</select>
      <select id="cat" aria-label="Kind"><option value="">All kinds</option>${Object.entries(CATEGORIES).map(([k, n]) => `<option value="${k}" ${f.cat === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <select id="sort" aria-label="Sort"><option value="az">A – Z</option><option value="ep" ${f.sort === 'ep' ? 'selected' : ''}>First appearance</option></select>
      <label><input type="checkbox" id="others" ${f.others ? 'checked' : ''}> other creatures</label>
    </div>
    <p class="count" id="count"></p>
    <div class="grid" id="grid"></div>
    ${aboutHtml()}`;
  const upd = () => {
    const l = filtered();
    $('#count').textContent = `${l.length} of ${WESEN.length} creatures`;
    $('#grid').innerHTML = l.length ? l.map(cardHtml).join('') : `<p class="empty">Nothing in the book matches that.</p>`;
  };
  $('#q').oninput = (e) => { f.q = e.target.value; save(); upd(); };
  $('#season').onchange = (e) => { f.season = e.target.value; save(); upd(); };
  $('#cat').onchange = (e) => { f.cat = e.target.value; save(); upd(); };
  $('#sort').onchange = (e) => { f.sort = e.target.value; save(); upd(); };
  $('#others').onchange = (e) => { f.others = e.target.checked; save(); upd(); };
  $('#grid').onclick = (e) => { const c = e.target.closest('.card'); if (c) open(c.dataset.id); };
  upd();
}
function cardHtml(w) {
  const e = epInfo(w.ep);
  return `<button class="card" data-id="${w.id}">${sketch(w.s)}
    <span class="marks">${ST.fav[w.id] ? '★' : ''}${ST.seen[w.id] ? ' ✓' : ''}</span>
    <h3>${esc(w.n)}</h3><div class="meta">${e.code}${w.t !== 'w' ? ` · <i>${TYPE[w.t].toLowerCase()}</i>` : ''}</div></button>`;
}

// ───────── one creature ─────────
let current = null, order = [];
function open(id, push = true) {
  const w = byId[id]; if (!w) return;
  current = w;
  order = tab === 'book' ? filtered().map(x => x.id) : WESEN.map(x => x.id);
  if (!order.includes(id)) order = WESEN.map(x => x.id);
  if (push) history.pushState({ w: id }, '', '#/w/' + id);
  const e = epInfo(w.ep), i = order.indexOf(id);
  const prev = byId[order[(i - 1 + order.length) % order.length]], next = byId[order[(i + 1) % order.length]];
  const same = (debuts[w.ep] || []).filter(x => x !== w);
  const also = (w.also || []).map(epInfo);
  const kin = WESEN.filter(x => x !== w && x.c === w.c).slice(0, 12);
  $('#detail').innerHTML = `
    <div class="dbar">
      <button class="btn" data-a="close" aria-label="Back">← Back</button>
      <span class="sp"></span>
      <button class="btn ${ST.seen[id] ? 'on' : ''}" data-a="seen" aria-pressed="${!!ST.seen[id]}">✓ Seen</button>
      <button class="btn ${ST.fav[id] ? 'on' : ''}" data-a="fav" aria-pressed="${!!ST.fav[id]}" aria-label="Favourite">★</button>
      <button class="btn" data-a="prev" aria-label="Previous: ${esc(prev.n)}">‹</button>
      <button class="btn" data-a="next" aria-label="Next: ${esc(next.n)}">›</button>
    </div>
    <article class="page">
      <figure class="plate">${sketch(w.s)}<figcaption>Pencil sketch of ${esc(SKETCHES[w.s].cap)} — the creature the ${esc(w.n)} is modelled on. Not the show’s own design.</figcaption></figure>
      <div>
        <h2>${esc(w.n)}</h2>
        ${w.m ? `<p class="mean">${esc(w.m)}</p>` : ''}
        <div><span class="tag">${CATEGORIES[w.c]}</span><span class="tag ${w.t === 'w' ? '' : 'red'}">${TYPE[w.t]}</span>${w.r ? '<span class="tag red">Recurring</span>' : ''}</div>
        <h4>Appearances</h4>
        <dl class="appear">
          <dt>First seen</dt><dd>Season ${e.season}, episode ${e.episode}: <i>${esc(e.title)}</i><br><span class="dim">${fmtDate(e.date)} · episode ${e.ep} of 123</span></dd>
          ${also.map(a => `<dt>Also early in</dt><dd>Season ${a.season}, episode ${a.episode}: <i>${esc(a.title)}</i></dd>`).join('')}
          ${w.r ? `<dt>Later</dt><dd>Returns throughout the series.</dd>` : ''}
        </dl>
        <h4>Nature &amp; behaviour</h4>
        <p class="dropcap">${esc(w.d)}</p>
        ${w.k ? `<h4>In the series</h4><p>${esc(w.k)}</p>` : ''}
        ${same.length ? `<h4>Also first seen in this episode</h4><div class="chips">${same.map(x => `<button class="chip" data-id="${x.id}">${esc(x.n)}</button>`).join('')}</div>` : ''}
        ${kin.length ? `<h4>Related: ${CATEGORIES[w.c].toLowerCase()}</h4><div class="chips">${kin.map(x => `<button class="chip" data-id="${x.id}">${esc(x.n)}</button>`).join('')}</div>` : ''}
      </div>
    </article>`;
  $('#detail').hidden = false;
  $('#detail').scrollTop = 0;
  document.body.style.overflow = 'hidden';
  $('#detail [data-a=close]').focus({ preventScroll: true });
}
function close(push = true) {
  if ($('#detail').hidden) return false;
  $('#detail').hidden = true; document.body.style.overflow = '';
  if (push && history.state?.w) history.back();
  render();
  return true;
}
$('#detail').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-id]'); if (chip) { open(chip.dataset.id, false); history.replaceState({ w: chip.dataset.id }, '', '#/w/' + chip.dataset.id); return; }
  const b = e.target.closest('[data-a]'); if (!b || !current) return;
  const a = b.dataset.a, id = current.id, i = order.indexOf(id);
  if (a === 'close') close();
  else if (a === 'seen' || a === 'fav') { const m = a === 'seen' ? ST.seen : ST.fav; if (m[id]) delete m[id]; else m[id] = Date.now(); save(); open(id, false); }
  else if (a === 'prev' || a === 'next') { const n = order[(i + (a === 'next' ? 1 : -1) + order.length) % order.length]; open(n, false); history.replaceState({ w: n }, '', '#/w/' + n); }
});
addEventListener('keydown', (e) => {
  if ($('#detail').hidden) return;
  if (e.key === 'Escape') close();
  else if (e.key === 'ArrowRight') $('#detail [data-a=next]').click();
  else if (e.key === 'ArrowLeft') $('#detail [data-a=prev]').click();
});
// swipe left/right between creatures on touch screens
let sx = null;
$('#detail').addEventListener('touchstart', (e) => { sx = e.touches.length === 1 ? [e.touches[0].clientX, e.touches[0].clientY] : null; }, { passive: true });
$('#detail').addEventListener('touchend', (e) => {
  if (!sx) return; const t = e.changedTouches[0], dx = t.clientX - sx[0], dy = t.clientY - sx[1]; sx = null;
  if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) $(`#detail [data-a=${dx < 0 ? 'next' : 'prev'}]`).click();
});

// ───────── episodes ─────────
let epSeason = 1;
function renderEpisodes() {
  const per = [1, 2, 3, 4, 5, 6].map(s => WESEN.filter(w => seasonOf(w.ep).season === s).length), mx = Math.max(...per);
  let h = `<p class="count">Which creatures first appear in which episode. Tap a name to open its page.</p>
    <div class="bars" aria-label="New creatures per season">${per.map((n, i) => `<span>Season ${i + 1}</span><div class="b" style="width:${(n / mx) * 100}%"></div><span class="n">${n}</span>`).join('')}</div>
    <div class="seasons">${[1, 2, 3, 4, 5, 6].map(s => `<button class="btn ${s === epSeason ? 'on' : ''}" data-s="${s}">Season ${s}</button>`).join('')}</div>`;
  for (let ep = SEASON_START[epSeason - 1]; ep < SEASON_START[epSeason]; ep++) {
    const e = epInfo(ep), d = debuts[ep] || [];
    h += `<div class="ep ${d.length ? '' : 'none'}"><div class="no">E${e.episode}</div><div><span class="t">${esc(e.title)}</span> <span class="dt">· ${fmtDate(e.date)}</span>
      ${d.length ? `<div class="chips">${d.map(w => `<button class="chip" data-id="${w.id}">${esc(w.n)}</button>`).join('')}</div>` : `<div class="dt">No new creatures</div>`}</div></div>`;
  }
  $('#main').innerHTML = h + aboutHtml();
  $('#main').onclick = (e) => {
    const s = e.target.closest('[data-s]'); if (s) { epSeason = +s.dataset.s; renderEpisodes(); return; }
    const c = e.target.closest('[data-id]'); if (c) open(c.dataset.id);
  };
}

// ───────── my book ─────────
function renderMine() {
  const all = WESEN.filter(w => w.t === 'w'), seen = all.filter(w => ST.seen[w.id]);
  const favs = WESEN.filter(w => ST.fav[w.id]);
  const left = all.filter(w => !ST.seen[w.id]).sort((a, b) => a.ep - b.ep);
  $('#main').innerHTML = `
    <p>You have marked <b>${seen.length}</b> of ${all.length} Wesen as seen.</p>
    <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${all.length}" aria-valuenow="${seen.length}"><div style="width:${(seen.length / all.length) * 100}%"></div></div>
    <p class="count" style="margin-top:6px">Open a creature and press <b>✓ Seen</b> or <b>★</b> to add it here.</p>
    <h3 style="font:400 24px var(--display)">Favourites</h3>
    ${favs.length ? `<div class="grid">${favs.map(cardHtml).join('')}</div>` : '<p class="empty">No favourites yet.</p>'}
    <h3 style="font:400 24px var(--display)">Still to spot</h3>
    ${left.length ? `<div class="chips">${left.map(w => `<button class="chip" data-id="${w.id}">${esc(w.n)} <span class="dim">S${seasonOf(w.ep).season}</span></button>`).join('')}</div>` : '<p>Every Wesen spotted. A true Grimm.</p>'}
    ${aboutHtml()}`;
  $('#main').onclick = (e) => { const c = e.target.closest('[data-id]'); if (c) open(c.dataset.id); };
}

function aboutHtml() {
  return `<div class="about"><p><b>About this book.</b> A fan-made field guide to the Wesen and other creatures of the NBC series <i>Grimm</i> (2011–2017), not affiliated with NBC or Universal.
    First appearances follow the “List of Wesen and other creatures” in Wikipedia’s <i>List of Grimm characters</i>; the descriptions are written for this book.
    The pencil sketches show the real or legendary animal each creature is modelled on, not the creatures as they look in the show.</p>
    <p>Sketches drawn from icons by ${SKETCH_AUTHORS.join(', ')} at game-icons.net (CC BY 3.0), turned into pencil drawings for this book.</p></div>`;
}

// ───────── theme, history, start ─────────
function applyTheme() {
  if (ST.theme) document.documentElement.dataset.theme = ST.theme; else delete document.documentElement.dataset.theme;
  const dark = ST.theme ? ST.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  native?.setDark?.(dark);
  $('#themeBtn').textContent = dark ? 'Light' : 'Dark';
}
$('#themeBtn').onclick = () => {
  const dark = ST.theme ? ST.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  ST.theme = dark ? 'light' : 'dark'; save(); applyTheme();
};
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
addEventListener('popstate', () => route(false));
function route(push) {
  const m = /^#\/w\/(.+)$/.exec(location.hash);
  if (m && byId[m[1]]) { open(m[1], false); return; }
  if (!$('#detail').hidden) close(false);
  const t = /^#\/(eps|mine)$/.exec(location.hash);
  go(t ? t[1] : 'book', false);
}
window.__terug = () => close();   // Android back button: close the page if one is open
applyTheme();
route(false);
window.__wesen = { WESEN, open, close, go };
