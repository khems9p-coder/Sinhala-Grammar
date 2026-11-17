(function () {
'use strict';
var $ = function (s) { return document.querySelector(s); };
var view = $('#view'), bar = $('#bar'), titleEl = $('#title'), backB = $('#back'), markB = $('#mark'), prog = $('#prog');
var store = {
  get: function (k, d) { try { var v = localStorage.getItem('sg_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem('sg_' + k, JSON.stringify(v)); } catch (e) {} }
};
var TOC = null, SEARCH = null, cur = null, pos = store.get('pos', {}), done = store.get('done', {}), saved = store.get('saved', []);
var settings = store.get('set', { fs: 16, theme: 'auto' });

function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function norm(s) { return s.replace(/[‌‍]/g, '').toLowerCase(); }
function applySettings() {
  var r = document.documentElement;
  r.style.setProperty('--fs', settings.fs + 'px');
  var dark = settings.theme === 'dark' || (settings.theme === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  r.setAttribute('data-theme', dark ? 'dark' : 'light');
  var m = document.querySelector('meta[name=theme-color]'); if (m) m.content = dark ? '#0b1118' : '#1F3A5F';
}
applySettings();

function load() {
  if (TOC) return Promise.resolve(TOC);
  return fetch('data/toc.json').then(function (r) { return r.json(); }).then(function (j) { TOC = j; return j; });
}
function byId(id) { for (var i = 0; i < TOC.chapters.length; i++) if (TOC.chapters[i].id === id) return i; return -1; }
function badge(c) {
  if (c.kind === 'lesson') return ['L' + c.id.slice(1), ''];
  if (c.id === 'FINAL') return ['★', 't'];
  if (c.kind === 'test') return ['R' + c.id.slice(2), 't'];
  if (c.kind === 'appendix') return [c.id.slice(2), 'a'];
  return ['✎', 'f'];
}
function setTab(t) { document.querySelectorAll('#tabs a').forEach(function (a) { a.classList.toggle('on', a.dataset.t === t); }); }
function chrome(o) {
  titleEl.textContent = o.title || 'Sinhala Grammar';
  backB.hidden = !o.back; markB.hidden = !o.mark; prog.style.width = '0';
  setTab(o.tab || '');
}

/* ---------- home ---------- */
function strip(t) { return t.replace(/^(Lesson \d+: |Appendix [A-N]: )/, ''); }
function chRow(c, withSubs) {
  var b = badge(c), subs = c.sections.filter(function (x) { return x.level === 2 || c.kind === 'front'; });
  var h = '<div class="chw"><div class="chr"><a class="ch" href="#/c/' + c.id + '"><span class="n ' + b[1] + '">' + b[0] + '</span><span class="tx"><b>' + esc(strip(c.title)) + '</b>' + (c.si ? '<span>' + esc(c.si) + '</span>' : '') + '</span>' + (done[c.id] ? '<span class="ok">&#10003;</span>' : '') + '</a>';
  if (withSubs && subs.length > 1) h += '<button class="ex" data-id="' + c.id + '" aria-label="Show topics" aria-expanded="false">&#9662;</button>';
  h += '</div>';
  if (withSubs && subs.length > 1) {
    h += '<div class="subs" hidden>';
    subs.forEach(function (x) { h += '<a class="sub" href="#/c/' + c.id + '/' + x.id + '">' + esc(x.title) + '</a>'; });
    h += '</div>';
  }
  return h + '</div>';
}
function home() {
  chrome({ title: 'Sinhala Grammar', tab: 'home' });
  var last = store.get('last', null), html = '';
  var nd = TOC.chapters.filter(function (c) { return done[c.id]; }).length;
  html += '<div class="hero compact"><img src="media/cover.png" alt=""><div><div class="si">සිංහල ව්‍යාකරණය</div><h1>Sinhala Grammar for Beginners</h1><p>Compiled by Khem Chetry &middot; ' + nd + '/' + TOC.chapters.length + ' finished</p></div></div>';
  html += '<div class="sbox home"><input id="tf" type="search" placeholder="Find a topic: nouns, past tense, dative…" autocomplete="off" autocapitalize="off" spellcheck="false"></div>';
  if (last && byId(last.id) >= 0) {
    var lc = TOC.chapters[byId(last.id)];
    html += '<a class="cont" href="#/c/' + lc.id + '"><div><small>Continue reading</small><b>' + esc(lc.title) + '</b></div><span class="go">&#8250;</span></a>';
  }
  html += '<div class="ctl"><h2>Contents</h2><span><button id="exall">Expand all topics</button></span></div><div id="toc">';
  TOC.parts.forEach(function (p) {
    var list = TOC.chapters.filter(function (c) { return c.part === p; });
    if (!list.length) return;
    html += '<details class="part" open><summary>' + esc(p) + ' <span class="cnt">' + list.length + '</span></summary>';
    list.forEach(function (c) { html += chRow(c, true); });
    html += '</details>';
  });
  html += '</div><div id="fres" hidden></div>';
  view.innerHTML = html;
  var allOpen = false;
  view.onclick = function (e) {
    var x = e.target.closest('.ex');
    if (x) { var s = x.closest('.chw').querySelector('.subs'); s.hidden = !s.hidden; x.classList.toggle('open', !s.hidden); x.setAttribute('aria-expanded', String(!s.hidden)); return; }
    if (e.target.id === 'exall') {
      allOpen = !allOpen;
      view.querySelectorAll('.chw').forEach(function (w) { var s = w.querySelector('.subs'), b = w.querySelector('.ex'); if (s) { s.hidden = !allOpen; b.classList.toggle('open', allOpen); } });
      e.target.textContent = allOpen ? 'Collapse all topics' : 'Expand all topics';
    }
  };
  var tf = $('#tf');
  tf.oninput = function () {
    var q = norm(tf.value).trim(), r = $('#fres'), t = $('#toc'), c = view.querySelector('.ctl');
    if (!q) { r.hidden = true; t.hidden = false; c.hidden = false; return; }
    var terms = q.split(/\s+/), out = '', n = 0;
    function ok(str) { var l = norm(str); return terms.every(function (w) { return l.indexOf(w) >= 0; }); }
    TOC.chapters.forEach(function (ch) {
      if (ok(ch.title + ' ' + (ch.si || '') + ' ' + (ch.hi || ''))) { out += chRow(ch, false); n++; }
      ch.sections.forEach(function (sec) {
        if (sec.level !== 2 && ch.kind !== 'front') return;
        if (ok(sec.title)) { out += '<a class="hit" href="#/c/' + ch.id + '/' + sec.id + '"><em>' + esc(ch.title) + '</em><b>' + esc(sec.title) + '</b></a>'; n++; }
      });
    });
    r.innerHTML = out || '<p class="muted">No topic found. Try the Search tab to look inside the lessons.</p>';
    r.hidden = false; t.hidden = true; c.hidden = true;
  };
  window.scrollTo(0, store.get('homeY', 0));
}

/* ---------- reader ---------- */
var scrollT = null;
function chapter(id, sid, q) {
  var i = byId(id);
  if (i < 0) { location.hash = '#/'; return; }
  var c = TOC.chapters[i]; cur = { c: c, i: i, sid: sid };
  chrome({ title: c.title.replace(/^Lesson (\d+): /, 'L$1 · '), back: true, mark: true, tab: 'home' });
  updateStar();
  view.innerHTML = '<div class="muted">Loading…</div>';
  fetch('data/ch_' + id + '.html').then(function (r) { return r.text(); }).then(function (h) {
    if (!cur || cur.c.id !== id) return;
    var p = TOC.chapters[i - 1], n = TOC.chapters[i + 1];
    var nav = '<div class="pn">' + (p ? '<a href="#/c/' + p.id + '"><small>&#8249; Previous</small>' + esc(p.title.replace(/^(Lesson \d+: |Appendix [A-N]: )/, '')) + '</a>' : '') +
      (n ? '<a class="nx" href="#/c/' + n.id + '"><small>Next &#8250;</small>' + esc(n.title.replace(/^(Lesson \d+: |Appendix [A-N]: )/, '')) + '</a>' : '') + '</div>';
    view.innerHTML = '<div id="doc">' + h + '</div>' + nav + (c.sections.length > 1 ? '<button class="fab" id="fab">&#9776; Sections</button>' : '');
    var fab = $('#fab'); if (fab) fab.onclick = openSections;
    store.set('last', { id: id });
    var target = sid && document.getElementById(sid);
    if (q) highlight(target || $('#doc'), q);
    if (target) setTimeout(function () { target.scrollIntoView(); }, 30);
    else window.scrollTo(0, (pos[id] || 0));
    onScroll();
  }).catch(function () { view.innerHTML = '<p class="muted">This chapter could not be loaded.</p>'; });
}
function highlight(root, q) {
  var terms = norm(q).split(/\s+/).filter(Boolean); if (!terms.length) return;
  var w = document.createTreeWalker(root.id === 'doc' ? root : root.parentNode, NodeFilter.SHOW_TEXT), nodes = [], n, hits = 0, first = null;
  while ((n = w.nextNode())) nodes.push(n);
  for (var k = 0; k < nodes.length && hits < 6; k++) {
    var node = nodes[k], t = norm(node.nodeValue);
    if (node.nodeValue.length !== t.length) continue;
    for (var j = 0; j < terms.length; j++) {
      var ix = t.indexOf(terms[j]);
      if (ix < 0) continue;
      var r = document.createRange(); r.setStart(node, ix); r.setEnd(node, ix + terms[j].length);
      var m = document.createElement('mark'); r.surroundContents(m); hits++; if (!first) first = m; break;
    }
  }
  if (first && root.id === 'doc') setTimeout(function () { first.scrollIntoView({ block: 'center' }); }, 40);
}
function onScroll() {
  if (!cur) { prog.style.width = '0'; return; }
  var h = document.documentElement.scrollHeight - innerHeight, y = scrollY;
  prog.style.width = (h > 0 ? Math.min(100, y / h * 100) : 0) + '%';
  if (h > 0 && y / h > 0.96 && !done[cur.c.id]) { done[cur.c.id] = 1; store.set('done', done); }
  clearTimeout(scrollT);
  var id = cur.c.id;
  scrollT = setTimeout(function () { pos[id] = Math.round(y); store.set('pos', pos); }, 300);
}
addEventListener('scroll', function () { if (cur) onScroll(); }, { passive: true });
function currentSection() {
  var hs = document.querySelectorAll('#doc h2[id]'), best = null;
  for (var i = 0; i < hs.length; i++) { if (hs[i].getBoundingClientRect().top < 120) best = hs[i]; else break; }
  return best;
}
function sheet(html) { $('#panel').innerHTML = html; $('#sheet').hidden = false; }
function closeSheet() { $('#sheet').hidden = true; }
$('#sheet .scrim').onclick = closeSheet;
function openSections() {
  var c = cur.c, h = '<h3>' + esc(c.title) + '</h3>';
  c.sections.forEach(function (s) { h += '<a class="sec" href="#/c/' + c.id + '/' + s.id + '">' + esc(s.title) + '</a>'; });
  sheet(h);
  $('#panel').onclick = function (e) { if (e.target.closest('a')) closeSheet(); };
}
function isSaved() { return cur && saved.some(function (s) { return s.id === cur.c.id; }); }
function updateStar() { markB.innerHTML = isSaved() ? '&#9733;' : '&#9734;'; markB.style.color = isSaved() ? '#F2C14E' : '#fff'; }
markB.onclick = function () {
  if (!cur) return;
  if (isSaved()) saved = saved.filter(function (s) { return s.id !== cur.c.id; });
  else { var s = currentSection(); saved.unshift({ id: cur.c.id, sid: s ? s.id : '', t: s ? s.textContent.trim() : '', ts: Date.now() }); }
  store.set('saved', saved); updateStar();
};
backB.onclick = function () { history.length > 1 ? history.back() : (location.hash = '#/'); };
$('#aa').onclick = function () {
  var h = '<h3>Reading settings</h3><div class="row"><span class="lbl">Text size</span><div class="seg"><button data-fs="-1">A&minus;</button><button data-fs="1">A+</button></div></div>' +
    '<div class="row"><span class="lbl">Theme</span><div class="seg">' + ['auto', 'light', 'dark'].map(function (t) { return '<button data-th="' + t + '" class="' + (settings.theme === t ? 'on' : '') + '">' + t[0].toUpperCase() + t.slice(1) + '</button>'; }).join('') + '</div></div>';
  sheet(h);
  $('#panel').onclick = function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.fs) settings.fs = Math.max(13, Math.min(26, settings.fs + (+b.dataset.fs) * 1.5));
    if (b.dataset.th) settings.theme = b.dataset.th;
    store.set('set', settings); applySettings();
    $('#aa').click();
  };
};

/* ---------- search ---------- */
function search(q) {
  document.title = 'Sinhala Grammar for Beginners';
  chrome({ title: 'Search', tab: 'search' });
  view.innerHTML = '<div class="sbox"><input id="q" type="search" placeholder="Search Sinhala, English, Hindi or romanised words" autocomplete="off" autocapitalize="off" spellcheck="false"></div><div id="res"><div class="hint"><button>dative</button><button>kiyawanawa</button><button>passive</button><button>ස්තූතියි</button><button>colours</button><button>essay</button></div><p class="muted">Type at least 2 letters. Words in the Roman letters (such as <b>mama</b>) are searchable too.</p></div>';
  var inp = $('#q'); inp.value = q || '';
  var t = null;
  function go() {
    var v = norm(inp.value).trim(), res = $('#res');
    if (v.length < 2) return;
    res.innerHTML = '<p class="muted">Searching…</p>';
    (SEARCH ? Promise.resolve(SEARCH) : fetch('data/search.json').then(function (r) { return r.json(); }).then(function (j) { SEARCH = j; return j; })).then(function (S) {
      if (norm(inp.value).trim() !== v) return;
      var terms = v.split(/\s+/), out = [];
      for (var i = 0; i < S.length; i++) {
        var u = S[i], ok = true, sc = 0;
        for (var j = 0; j < terms.length; j++) { var ix = u[3].indexOf(terms[j]); if (ix < 0) { ok = false; break; } sc += ix < 60 ? 3 : 0; if (norm(u[2]).indexOf(terms[j]) >= 0) sc += 6; }
        if (ok) out.push([sc, u]);
      }
      out.sort(function (a, b) { return b[0] - a[0]; });
      if (!out.length) { res.innerHTML = '<p class="muted">No results for “' + esc(inp.value) + '”.</p>'; return; }
      var h = '<p class="muted" style="margin:4px 0 10px;text-align:left">' + out.length + ' section' + (out.length > 1 ? 's' : '') + ' found</p>';
      out.slice(0, 60).forEach(function (o) {
        var u = o[1], ci = byId(u[0]), c = TOC.chapters[ci], ix = u[3].indexOf(terms[0]);
        var a = Math.max(0, ix - 45), snip = u[3].slice(a, ix + 110);
        var re = new RegExp('(' + terms.map(function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'g');
        snip = esc(snip).replace(re, '<mark>$1</mark>');
        h += '<a class="hit" href="#/c/' + u[0] + (u[1] ? '/' + u[1] : '') + '?q=' + encodeURIComponent(v) + '"><em>' + esc(c.title) + '</em><b>' + esc(u[2]) + '</b><span>' + (a ? '…' : '') + snip + '…</span></a>';
      });
      res.innerHTML = h;
    });
  }
  inp.oninput = function () { clearTimeout(t); t = setTimeout(go, 220); };
  $('#res').onclick = function (e) { var b = e.target.closest('.hint button'); if (b) { inp.value = b.textContent; go(); } };
  if (q) go(); else setTimeout(function () { inp.focus(); }, 60);
}

/* ---------- saved / about ---------- */
function savedView() {
  chrome({ title: 'Saved places', tab: 'saved' });
  var h = '';
  if (!saved.length) h = '<p class="muted">No saved places yet.<br>Open any lesson and tap the star &#9734; at the top to save your place.</p>';
  saved.forEach(function (s, i) {
    var c = TOC.chapters[byId(s.id)]; if (!c) return;
    h += '<a class="hit" href="#/c/' + s.id + (s.sid ? '/' + s.sid : '') + '"><button class="del" data-i="' + i + '" aria-label="Remove">&times;</button><em>' + esc(c.title) + '</em><b>' + esc(s.t || 'Start of chapter') + '</b></a>';
  });
  view.innerHTML = h;
  view.onclick = function (e) { var b = e.target.closest('.del'); if (!b) return; e.preventDefault(); saved.splice(+b.dataset.i, 1); store.set('saved', saved); savedView(); };
}
function about() {
  chrome({ title: 'About', tab: 'about' });
  var A = window.APP || {}, dev = A.developer || 'Khem Chetry';
  var em = A.email ? '<p><b>E-mail:</b> <a href="mailto:' + esc(A.email) + '?subject=' + encodeURIComponent('Sinhala Grammar for Beginners: feedback') + '">' + esc(A.email) + '</a></p>' : '';
  var web = A.website ? '<p><b>Website:</b> <a href="' + esc(A.website) + '">' + esc(A.website) + '</a></p>' : '';
  var fb = A.email ? '<a class="btn" href="mailto:' + esc(A.email) + '?subject=' + encodeURIComponent('Sinhala Grammar for Beginners: correction or suggestion') + '">Send feedback</a> ' : '';
  view.innerHTML = '<div class="about">' +
    '<div class="card"><h2 style="margin-top:0">Sinhala Grammar for Beginners</h2><p style="font-family:var(--sin);font-size:1.2rem;color:var(--maroon)">සිංහල ව්‍යාකරණය</p><p>A beginner’s guide to Sinhala grammar, especially for Hindi and English speakers. Thirty-two lessons, six revision tests and fourteen appendices, all available offline.</p><p><b>Compiled by</b> ' + esc(dev) + '</p><p class="mut">Version ' + esc(A.version || '1.0.0') + ' &middot; Updated ' + esc(A.updated || '') + '</p></div>' +
    '<div class="card"><b>Please double-check</b><p>This book was prepared with the help of an AI tool together with the compiler’s own knowledge. There may be mistakes in spelling, grammar rules or examples. Teachers and native speakers of Sinhala are requested to check the contents before relying on them. Corrections and suggestions are always welcome.</p></div>' +
    '<div class="card"><b>Contact and feedback</b>' + em + web + '<p>Found a mistake or have an idea? Please tell the developer.</p><p>' + fb + '<button class="btn o" id="share">Share this app</button></p></div>' +
    '<div class="card"><b>Legal</b><p><a href="privacy.html">Privacy Policy</a><br><a href="terms.html">Terms of Use and Disclaimer</a></p><p class="mut">The app collects no personal data, shows no ads and works fully offline.</p></div>' +
    '<div class="card"><b>Colour code</b><p>Subject <span style="color:#1F5FA8;font-weight:700">blue</span> · object <span style="color:#C79100;font-weight:700">amber</span> · verb <span style="color:#B3261E;font-weight:700">red</span> · Sinhala script <span style="color:#7B1E3A;font-weight:700">maroon</span> · Hindi <span style="color:#2E6B3E;font-weight:700">green</span>.</p></div>' +
    '<div class="card"><b>Tips</b><p>Tap <b>Aa</b> to change text size or switch to dark mode. Swipe sideways on wide tables. Verb and case tables are easiest to read with the phone turned sideways. Tap the star to save your place.</p><p><button class="btn o" id="reset">Reset progress</button></p></div>' +
    '<div class="card"><b>Acknowledgements</b><p>Facts about Sri Lanka follow the 2024 Census and official sources. Thanks to all teachers and learners of Sinhala who give their feedback.</p></div>' +
    '<p class="mut" style="text-align:center">&copy; 2026 ' + esc(dev) + '. All rights reserved.</p></div>';
  $('#reset').onclick = function () { if (confirm('Clear finished marks and reading positions?')) { done = {}; pos = {}; store.set('done', done); store.set('pos', pos); store.set('last', null); about(); } };
  $('#share').onclick = function () {
    var txt = 'Sinhala Grammar for Beginners: a free offline book for learning Sinhala.' + (A.website ? ' ' + A.website : '');
    if (navigator.share) navigator.share({ title: 'Sinhala Grammar for Beginners', text: txt }).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { alert('Copied. You can paste it into a message.'); });
  };
}

/* ---------- router ---------- */
function route() {
  closeSheet(); view.onclick = null;
  var h = location.hash.replace(/^#\/?/, ''), qs = '', qi = h.indexOf('?');
  if (qi >= 0) { qs = h.slice(qi + 1); h = h.slice(0, qi); }
  var q = (/(?:^|&)q=([^&]*)/.exec(qs) || [])[1]; q = q ? decodeURIComponent(q) : '';
  var parts = h.split('/');
  if (!(parts[0] === '' && cur === null)) { /* keep */ }
  if (parts[0] !== 'c') { if (cur) { cur = null; } }
  load().then(function () {
    if (parts[0] === 'c') chapter(parts[1], parts[2], q);
    else if (parts[0] === 'search') search(q);
    else if (parts[0] === 'saved') savedView();
    else if (parts[0] === 'about') about();
    else home();
  });
}
addEventListener('hashchange', function () { if (!cur) store.set('homeY', 0); route(); });
document.addEventListener('click', function (e) { var a = e.target.closest('details.part summary'); if (a) store.set('homeY', scrollY); });
route();
if ('serviceWorker' in navigator && !window.Capacitor && /^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
