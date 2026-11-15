'use strict';
// Boys Club analytics: playtime and progress of every member, visible to anyone who has the club password.
(function () {
  const G = window.G;
  const A = G.analytics = { open: false, sort: 'play', dir: -1, rows: [], sel: -1 };
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- progress score: seven parts adding up to 100 ----------
  const PARTS = [
    { k: 'missions', n: 'Story missions', w: 25, max: 4, unit: 'missions', get: d => Object.keys(d.state.missions || {}).filter(m => m !== 'm1').length },
    { k: 'earned', n: 'Money earned', w: 15, max: 500000, unit: 'taka', get: d => d.state.stats.earned || 0 },
    { k: 'jobs', n: 'Jobs done (fares, deliveries, bus stops)', w: 15, max: 30, unit: 'jobs', get: d => { const s = d.state.stats; return (s.fares || 0) + (s.deliveries || 0) + (s.busStops || 0); } },
    { k: 'props', n: 'Properties bought', w: 15, max: 6, unit: 'properties', get: d => Object.keys(d.state.owned || {}).length },
    { k: 'cars', n: 'Vehicles bought', w: 10, max: 5, unit: 'vehicles', get: d => (d.state.garage || []).length },
    { k: 'guns', n: 'Weapons owned', w: 10, max: 11, unit: 'weapons', get: d => Math.max(0, Object.keys(d.p.inv || {}).length - 1) },
    { k: 'km', n: 'Distance travelled', w: 10, max: 100, unit: 'km', get: d => ((d.state.stats.driven || 0) + (d.state.stats.walked || 0)) / 1000 }
  ];
  A.PARTS = PARTS;
  A.score = function (d) { let tot = 0; const parts = PARTS.map(p => { const v = p.get(d), f = Math.min(1, v / p.max); tot += f * p.w; return { p, v, f }; }); return { pct: Math.round(tot), parts }; };
  const TITLES = [[80, 'Legend of Dhaka'], [55, 'Cantonment boss'], [30, 'Known face'], [10, 'Street regular'], [0, 'New in town']];
  const title = pct => TITLES.find(t => pct >= t[0])[1];
  const dur = s => { s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? h + ' h ' + (m < 10 ? '0' : '') + m + ' min' : m ? m + ' min' : s ? s + ' s' : '0 min'; };
  const compact = n => { n = Math.round(n || 0); const a = Math.abs(n); return a >= 1e7 ? (n / 1e6).toFixed(1) + 'M' : a >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : a >= 1e4 ? Math.round(n / 1e3) + 'K' : n.toLocaleString('en-US'); };
  const ago = ms => { const s = Math.max(0, ms / 1000); return s < 3600 ? Math.max(1, Math.round(s / 60)) + ' min ago' : s < 86400 ? Math.round(s / 3600) + ' h ago' : Math.round(s / 86400) + ' d ago'; };

  function build(saves) {
    const now = G.cloud.now();
    return G.BOYS.map((b, i) => {
      const sv = saves[i], d = sv && sv.d && sv.d.state && sv.d.p ? sv.d : null, r = { i, name: b.name, role: b.role, played: !!d, me: G.state.boy === i && G.running };
      if (!d) return Object.assign(r, { play: 0, pct: 0, worth: 0, missions: 0, pk: 0, pd: 0, last: 0, online: false, parts: PARTS.map(p => ({ p, v: 0, f: 0 })) });
      const st = d.state.stats || (d.state.stats = {}), sc = A.score(d);
      return Object.assign(r, { d, play: st.playSec || 0, pct: sc.pct, parts: sc.parts, worth: (d.p.money || 0) + (d.p.bank || 0), missions: sc.parts[0].v, pk: st.pvpK || 0, pd: st.pvpD || 0, last: sv.t || 0, online: !!sv.t && now - sv.t < 100000 });
    });
  }
  const COLS = [['name', 'Member', ''], ['play', 'Playtime', ''], ['pct', 'Progress', ''], ['worth', 'Net worth', 'n'], ['missions', 'Missions', 'n'], ['pk', 'PvP kills', 'n'], ['last', 'Last played', 'n']];
  function render() {
    const body = $('anaBody'); if (!body) return; const rows = A.rows.slice(), k = A.sort;
    rows.sort((a, b) => (k === 'name' ? a.name.localeCompare(b.name) * -A.dir : (a[k] - b[k]) * A.dir) || b.play - a.play || a.i - b.i);
    const played = rows.filter(r => r.played), total = played.reduce((s, r) => s + r.play, 0), top = played.slice().sort((a, b) => b.play - a.play)[0], far = played.slice().sort((a, b) => b.pct - a.pct)[0], maxPlay = Math.max(1, ...rows.map(r => r.play)), online = rows.filter(r => r.online).length;
    let h = '<div class="kpis">' + [['Total playtime', dur(total), 'all members together'], ['Members who have played', played.length + ' of ' + rows.length, online ? online + ' online now' : 'nobody online now'], ['Most time played', top ? dur(top.play) : 'none yet', top ? top.name : ''], ['Furthest progress', far ? far.pct + '%' : 'none yet', far ? far.name + ', ' + title(far.pct) : '']].map(t => `<div class="kpi"><span>${t[0]}</span><b>${esc(t[1])}</b><small>${esc(t[2])}</small></div>`).join('') + '</div>';
    h += '<div class="anaWrap"><table class="ana"><thead><tr><th class="n">#</th>' + COLS.map(c => `<th class="${c[2]}"><button data-k="${c[0]}" aria-sort="${A.sort === c[0] ? (A.dir < 0 ? 'descending' : 'ascending') : 'none'}">${c[1]}${A.sort === c[0] ? (A.dir < 0 ? ' ▼' : ' ▲') : ''}</button></th>`).join('') + '</tr></thead><tbody>';
    rows.forEach((r, n) => {
      const status = r.online ? '<i class="on" title="Saved in the last two minutes"></i>Online' : r.played ? '' : 'Has not played yet';
      h += `<tr data-i="${r.i}" class="${r.played ? '' : 'none'}${r.i === A.sel ? ' sel' : ''}" tabindex="0"><td class="n">${n + 1}</td><td><b>${esc(r.name)}${r.me ? ' <em>you</em>' : ''}</b><small>${status || esc(r.role)}</small></td>`
        + `<td class="pbar" title="${esc(r.name)}: ${dur(r.play)} played"><span><i style="width:${r.play ? Math.max(1.5, r.play / maxPlay * 100) : 0}%"></i></span><u>${r.played ? dur(r.play) : ''}</u></td>`
        + `<td class="pbar" title="${esc(r.name)}: ${r.pct}% progress, ${title(r.pct)}"><span class="meter"><i style="width:${r.pct}%"></i></span><u>${r.played ? r.pct + '%' : ''}</u></td>`
        + `<td class="n">${r.played ? '৳' + compact(r.worth) : ''}</td><td class="n">${r.played ? r.missions + ' / ' + PARTS[0].max : ''}</td><td class="n">${r.played ? r.pk : ''}</td><td class="n">${r.online ? 'now' : r.last ? ago(G.cloud.now() - r.last) : ''}</td></tr>`;
    });
    h += '</tbody></table></div>';
    const s = rows.find(r => r.i === A.sel);
    if (s && s.played) { const st = s.d.state.stats, f = (l, v) => `<div><span>${l}</span><b>${v}</b></div>`;
      h += `<div class="detail"><h3>${esc(s.name)} <small>${s.pct}% · ${title(s.pct)}</small></h3><div class="parts">` + s.parts.map(q => `<div class="part" title="${esc(q.p.n)}: ${Math.round(q.f * q.p.w)} of ${q.p.w} points"><span>${q.p.n}</span><span class="meter"><i style="width:${q.f * 100}%"></i></span><u>${q.p.unit === 'taka' ? '৳' + compact(q.v) + (q.f >= 1 ? ', target met' : ' of ৳' + compact(q.p.max)) : q.p.unit === 'km' ? q.v.toFixed(1) + (q.f >= 1 ? ' km, target met' : ' of ' + q.p.max + ' km') : Math.min(q.v, q.p.max) + ' of ' + q.p.max + (q.v > q.p.max ? ' (' + q.v + ' done)' : '')}</u></div>`).join('') + '</div><div class="facts">'
        + f('Playtime', dur(s.play)) + f('Sessions', st.sessions || 1) + f('Cash', '৳' + compact(s.d.p.money)) + f('Bank', '৳' + compact(s.d.p.bank)) + f('Driven', ((st.driven || 0) / 1000).toFixed(1) + ' km') + f('On foot', ((st.walked || 0) / 1000).toFixed(1) + ' km') + f('Taxi fares', st.fares || 0) + f('Deliveries', st.deliveries || 0) + f('Bus stops', st.busStops || 0) + f('Robberies', st.robberies || 0) + f('NPC kills', st.kills || 0) + f('PvP kills / deaths', (st.pvpK || 0) + ' / ' + (st.pvpD || 0)) + f('Wasted', st.wasted || 0) + f('Busted', st.busted || 0) + '</div></div>'; }
    else h += '<p class="hint" style="margin:10px 0 0">Click a member to see how their progress is made up. Click a column heading to sort.</p>';
    body.innerHTML = h;
    body.querySelectorAll('th button').forEach(b => b.onclick = () => { const key = b.dataset.k; if (A.sort === key) A.dir = -A.dir; else { A.sort = key; A.dir = key === 'name' ? 1 : -1; } render(); });
    body.querySelectorAll('tbody tr').forEach(tr => { const pick = () => { const i = +tr.dataset.i; A.sel = A.sel === i ? -1 : i; render(); }; tr.onclick = pick; tr.onkeydown = e => { if (e.key === 'Enter') pick(); }; });
  }
  A.refresh = async function () {
    const note = $('anaNote'); if (note) note.textContent = 'Loading...';
    if (G.running && G.state.boy >= 0) G.game.save();
    const r = await G.boyAuth.allSaves(); A.rows = build(r.saves); A.cloud = r.cloud; A.at = Date.now();
    if (note) note.textContent = r.cloud ? 'Live from the server. Updates about once a minute while someone plays.' : 'Server not reachable: showing only what has been played on this device.';
    render();
  };
  A.show = function () {
    if (!G.boysUnlocked) return; A.open = true; G.ui.anaOpen = true; G.ui.refreshBlocking(); G.ui.unlock(); $('ana').classList.remove('hidden'); A.refresh();
    clearInterval(A.timer); A.timer = setInterval(() => { if (A.open) A.refresh(); }, 30000);
  };
  A.hide = function () { A.open = false; G.ui.anaOpen = false; clearInterval(A.timer); $('ana').classList.add('hidden'); G.ui.refreshBlocking(); if (!G.ui.blocking) G.ui.lock(); };
  A.init = function () { $('anaClose').onclick = A.hide; $('anaRefresh').onclick = A.refresh; addEventListener('keydown', e => { if (A.open && e.code === 'Escape') { e.preventDefault(); A.hide(); } }); };
})();
