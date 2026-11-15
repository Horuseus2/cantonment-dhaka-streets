'use strict';
// HUD, minimap, full map, shop menus, wardrobe, weapon wheel, pause and main menus.
(function () {
  const G = window.G, W = G.world;
  const U = G.ui = { blocking: false, waypoint: null, route: null, mapOpen: false, menu: null, markers: [] };
  const $ = id => document.getElementById(id);
  const el = {};
  U.init = function () {
    for (const id of ['hud', 'mm', 'hp', 'ar', 'stars', 'money', 'clock', 'wicon', 'wname', 'wammo', 'notes', 'obj', 'area', 'areaName', 'street', 'speedo', 'kmh', 'big', 'sub', 'prompt', 'cross', 'scope', 'wheel', 'shop', 'shopT', 'shopS', 'shopI', 'wardrobe', 'wardT', 'wardS', 'wardI', 'wardOk', 'wardCancel', 'mapv', 'mapc', 'legend', 'maptip', 'pause', 'pauseMain', 'boys', 'boysBody', 'menu', 'loading', 'fade', 'bigtext', 'mContinue', 'mNew', 'mBoys', 'mSettings', 'net', 'chat', 'chatIn', 'score', 'mp', 'mpBody', 'mMulti']) el[id] = $(id);
    U.el = el; U.mmx = el.mm.getContext('2d'); let s = ''; for (let i = 0; i < 5; i++) s += '<b>★</b>'; el.stars.innerHTML = s;
    el.wardOk.onclick = () => wardDone(true); el.wardCancel.onclick = () => wardDone(false);
    initMap(); initPause(); U.initNet();
    addEventListener('keydown', e => { if (U.menu) { if (e.code === 'Escape' || e.code === 'Backspace') { U.closeMenu(); e.preventDefault(); } else if (e.code === 'KeyS' || e.code === 'ArrowDown') menuSel(1); else if (e.code === 'KeyW' || e.code === 'ArrowUp') menuSel(-1); else if (e.code === 'Enter' || e.code === 'NumpadEnter') menuGo(U.menuIdx); } else if (U.ward && e.code === 'Escape') wardDone(false); });
  };
  const lock = () => { const c = G.renderer.domElement; if (c.requestPointerLock && !document.pointerLockElement) { try { const p = c.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } } };
  const unlock = () => { if (document.pointerLockElement) document.exitPointerLock(); };
  U.lock = lock; U.unlock = unlock;
  function refreshBlocking() { U.blocking = !!(U.menu || U.ward || U.mapOpen || U.paused || U.boysOpen || U.mainMenu || U.mpOpen || U.chatOpen); }

  // ---------- small HUD pieces ----------
  U.notify = function (t, colr) { const d = document.createElement('div'); d.className = 'note'; d.textContent = t; if (colr) d.style.borderLeftColor = colr; el.notes.appendChild(d); while (el.notes.children.length > 5) el.notes.firstChild.remove(); setTimeout(() => d.remove(), 6500); };
  U.subtitle = function (t) { el.sub.textContent = t; el.sub.style.opacity = 1; U.subT = 4; };
  U.prompt = function (t) { U.promptText = t; };
  U.bigLabel = function (t) { el.big.textContent = t; el.big.style.opacity = 1; U.bigT = 3.5; };
  U.objective = function (t, sub) { if (!t) { el.obj.classList.add('hidden'); return; } el.obj.classList.remove('hidden'); el.obj.innerHTML = ''; el.obj.append(t); if (sub) { const s = document.createElement('small'); s.textContent = sub; el.obj.appendChild(s); } };
  U.fade = function (on) { el.fade.style.opacity = on ? 1 : 0; };
  U.bigText = function (t, sub, colr) { if (!t) { el.bigtext.style.opacity = 0; return; } el.bigtext.innerHTML = ''; el.bigtext.append(t); if (sub) { const s = document.createElement('small'); s.textContent = sub; el.bigtext.appendChild(s); } el.bigtext.style.color = colr || '#fff'; el.bigtext.style.opacity = 1; };
  U.showHUD = function (on) { el.hud.classList.toggle('hidden', !on); };
  U.weaponChanged = function () { const pl = G.player, d = G.Weapons.DEFS[pl.weapon]; el.wicon.src = G.Weapons.icons[pl.weapon] || ''; el.wicon.style.filter = pl.weapon === 'fist' ? 'none' : 'invert(1) brightness(1.7) drop-shadow(0 1px 2px #000)'; el.wname.textContent = d.name; U.ammoKey = ''; };
  U.loading = function (p, t) { el.loading.querySelector('#loadbar i').style.width = Math.round(p * 100) + '%'; if (t) $('loadtxt').textContent = t; };

  // ---------- base map render ----------
  const ROADCOL = ['#e9a65a', '#ecd68c', '#ecd68c', '#d6dade', '#c3c8ce', '#8f959c', '#727880', '#676d75', '#b9bec4', '#4f555c', '#4f555c'];
  U.buildBase = function () {
    const b = W.bounds, S = U.S = 0.6, c = U.base = document.createElement('canvas'); c.width = Math.ceil((b.maxX - b.minX) * S); c.height = Math.ceil((b.maxZ - b.minZ) * S); const x = c.getContext('2d');
    const X = v => (v - b.minX) * S, Z = v => (v - b.minZ) * S;
    x.fillStyle = '#1f2329'; x.fillRect(0, 0, c.width, c.height);
    const ring = r => { x.moveTo(X(r[0]), Z(r[1])); for (let i = 2; i < r.length; i += 2) x.lineTo(X(r[i]), Z(r[i + 1])); x.closePath(); };
    x.fillStyle = '#25322a'; x.beginPath(); for (const cp of W.cantt) ring(cp.r); x.fill();
    const AC = { water: '#3f6f9c', park: '#2f4d35', wood: '#2a4630', golf: '#35583a', pitch: '#3a5f3f', sand: '#5d5742', cemetery: '#33443a', paved: '#343941', wetland: '#335a55' };
    for (const t in AC) { x.fillStyle = AC[t]; x.beginPath(); for (const a of W.areas) if (a.t === t) ring(a.r); x.fill(); }
    x.fillStyle = '#3c424b'; x.beginPath(); for (const bd of W.buildings) if (!bd.shop) ring(bd.r); x.fill(); x.fillStyle = '#4d5560'; x.beginPath(); for (const bd of W.buildings) if (bd.shop) ring(bd.r); x.fill();
    x.lineCap = 'round'; x.lineJoin = 'round';
    x.strokeStyle = '#7d848c'; x.setLineDash([6, 5]); x.lineWidth = 2; x.beginPath(); for (const r of W.rails) { x.moveTo(X(r[0]), Z(r[1])); for (let i = 2; i < r.length; i += 2) x.lineTo(X(r[i]), Z(r[i + 1])); } x.stroke(); x.setLineDash([]);
    for (const pass of [10, 9, 7, 6, 5, 8, 4, 3, 2, 1, 0]) { x.strokeStyle = ROADCOL[pass]; for (const elev of [false, true]) { for (const r of W.roads) { if (r.t !== pass || r.elev !== elev) continue; x.lineWidth = Math.max(pass >= 9 ? 0.8 : 1.3, r.w * S * (pass <= 4 ? 1.1 : 0.9)); x.beginPath(); x.moveTo(X(W.nx[r.k[0]]), Z(W.nz[r.k[0]])); for (let i = 1; i < r.k.length; i++) x.lineTo(X(W.nx[r.k[i]]), Z(W.nz[r.k[i]])); if (elev) { x.save(); x.strokeStyle = '#14161a'; x.lineWidth += 2.4; x.stroke(); x.restore(); } x.stroke(); } } }
    // labels for the big map
    U.roadLabels = []; for (const r of W.roads) { if (!r.name || r.t > 4 || /over bridge|foot over/i.test(r.name)) continue; const m = r.k[Math.floor(r.k.length / 2)], m2 = r.k[Math.max(0, Math.floor(r.k.length / 2) - 1)]; const lx = W.nx[m], lz = W.nz[m]; if (U.roadLabels.some(l => l.n === r.name && Math.hypot(l.x - lx, l.z - lz) < 700)) continue; let a = Math.atan2(W.nz[m] - W.nz[m2], W.nx[m] - W.nx[m2]); if (a > Math.PI / 2) a -= Math.PI; if (a < -Math.PI / 2) a += Math.PI; U.roadLabels.push({ n: r.name, x: lx, z: lz, a }); }
    U.blipPois = W.pois.filter(p => (G.props.CAT[p.c] || {}).blip <= 3);
  };
  // ---------- minimap ----------
  let mmT = 0, mmPois = [];
  function icon(x, c, px, py, ic, colr, size) { c.fillStyle = colr; c.beginPath(); c.arc(px, py, size, 0, 6.3); c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(0,0,0,.7)'; c.stroke(); if (ic) { c.font = Math.round(size * 1.25) + 'px "Segoe UI Emoji","Segoe UI Symbol",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(ic, px, py + 1); } }
  function arrow(c, px, py, ang, size, colr) { c.save(); c.translate(px, py); c.rotate(ang); c.beginPath(); c.moveTo(0, -size); c.lineTo(size * 0.72, size * 0.8); c.lineTo(0, size * 0.35); c.lineTo(-size * 0.72, size * 0.8); c.closePath(); c.fillStyle = colr; c.fill(); c.lineWidth = 2; c.strokeStyle = '#111'; c.stroke(); c.restore(); }
  function drawMinimap(dt) {
    const c = U.mmx, pl = G.player, cam = G.cam, w = 528, h = 384, b = W.bounds, S = U.S, interior = pl.mode === 'interior';
    const px = interior ? G.game.intPos.x : pl.pos.x, pz = interior ? G.game.intPos.z : pl.pos.z;
    const zoom = U.mmZoom = G.damp(U.mmZoom || 3, pl.mode === 'vehicle' || pl.mode === 'bus' || pl.mode === 'ride' ? G.lerp(2.6, 1.5, G.clamp(pl.speed / 30, 0, 1)) : 3.3, 2, dt);
    const rot = -Math.atan2(cam.dir.x, -cam.dir.z), cx = w / 2, cy = h * 0.62;
    c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#1f2329'; c.fillRect(0, 0, w, h);
    c.save(); c.translate(cx, cy); c.rotate(rot); c.scale(zoom / S, zoom / S); c.translate(-(px - b.minX) * S, -(pz - b.minZ) * S); c.imageSmoothingEnabled = true; c.drawImage(U.base, 0, 0);
    if (U.route) { c.strokeStyle = '#b56cf5'; c.lineWidth = 5 * S / zoom * 1.6; c.lineJoin = 'round'; c.beginPath(); const R = U.route; c.moveTo((px - b.minX) * S, (pz - b.minZ) * S); for (let i = U.routeI || 0; i < R.length; i++) c.lineTo((W.nx[R[i]] - b.minX) * S, (W.nz[R[i]] - b.minZ) * S); c.stroke(); }
    c.restore();
    const cr = Math.cos(rot), sr = Math.sin(rot), mm = (x, z) => { const dx = (x - px) * zoom, dz = (z - pz) * zoom; return [cx + dx * cr - dz * sr, cy + dx * sr + dz * cr]; };
    const clampEdge = (p) => { const m = 16; let ox = p[0] - cx, oy = p[1] - cy; const kx = ox > 0 ? (w - m - cx) / ox : ox < 0 ? (m - cx) / ox : 1e9, ky = oy > 0 ? (h - m - cy) / oy : oy < 0 ? (m - cy) / oy : 1e9, k = Math.min(kx, ky); if (k < 1) { p[0] = cx + ox * k; p[1] = cy + oy * k; return true; } return false; };
    mmT -= dt; if (mmT <= 0) { mmT = 0.5; mmPois = []; const R = 190; for (const p of U.blipPois) { const cat = G.props.CAT[p.c]; if (cat.blip > 1 && !(cat.blip === 2 && Math.abs(p.x - px) < 70 && Math.abs(p.z - pz) < 70)) continue; if (p.c === 'vip' && !G.boysUnlocked) continue; if (Math.abs(p.x - px) < R && Math.abs(p.z - pz) < R) mmPois.push(p); } for (const s of W.stops) if (Math.abs(s.sx - px) < R && Math.abs(s.sz - pz) < R) mmPois.push(s); }
    for (const p of mmPois) { const q = mm(p.sx !== undefined ? p.sx : p.x, p.sz !== undefined ? p.sz : p.z); if (q[0] < -10 || q[0] > w + 10 || q[1] < -10 || q[1] > h + 10) continue; const cat = G.props.CAT[p.c]; icon(0, c, q[0], q[1], cat.icon, cat.col, 13); }
    if (!interior) { for (const v of G.Veh.list) { if (v.ai && v.ai.chase && !v.dead) { const q = mm(v.x, v.z); clampEdge(q); icon(0, c, q[0], q[1], '', Math.floor(G.time * 4) % 2 ? '#e5484d' : '#3b86d8', 8); } else if ((v.owned || v.mission) && v.driver !== 'player') { const q = mm(v.x, v.z); if (q[0] > 0 && q[0] < w && q[1] > 0 && q[1] < h) icon(0, c, q[0], q[1], '🚘', '#2a2d33', 12); } } if (G.wanted.level > 0) for (const n of G.npc.list) if (n.cop && !n.dead && n.near < 120) { const q = mm(n.x, n.z); icon(0, c, q[0], q[1], '', Math.floor(G.time * 4) % 2 ? '#e5484d' : '#3b86d8', 6); } }
    if (G.net.active) for (const r of G.net.remotes.values()) { if (r.int || !r.buf.length) continue; const q = mm(r.x, r.z); clampEdge(q); icon(0, c, q[0], q[1], '', '#4fc3f7', 9); }
    for (const m of U.markers) { const q = mm(m.x, m.z); clampEdge(q); icon(0, c, q[0], q[1], m.icon || '', m.col || '#f5c542', 14); }
    if (U.waypoint) { const q = mm(U.waypoint.x, U.waypoint.z); clampEdge(q); icon(0, c, q[0], q[1], '', '#b56cf5', 10); }
    arrow(c, cx, cy, rot - pl.heading + Math.PI, 24, '#ffffff');
    const nq = [cx + Math.sin(rot) * 600, cy - Math.cos(rot) * 600]; clampEdge(nq); c.font = 'bold 22px "Segoe UI",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 4; c.strokeText('N', nq[0], nq[1]); c.fillText('N', nq[0], nq[1]);
  }
  // ---------- waypoint + GPS ----------
  U.setWaypoint = function (wp) { U.waypoint = wp; U.route = null; U.routeT = 0; };
  function updateRoute(dt) { const tgt = U.waypoint || U.gpsTarget; if (!tgt) { U.route = null; return; } U.routeT = (U.routeT || 0) - dt; const pl = G.player; if (pl.mode === 'interior') return;
    if (U.waypoint && Math.hypot(tgt.x - pl.pos.x, tgt.z - pl.pos.z) < 18 && pl.mode !== 'ride') { U.setWaypoint(null); U.notify('You have reached your waypoint'); return; }
    if (U.routeT <= 0) { U.routeT = 2; const a = W.nearestNode(pl.pos.x, pl.pos.z, true), bn = W.nearestNode(tgt.x, tgt.z, true); U.route = W.findPath(a, bn); U.routeI = 0; }
    if (U.route) { let bi = U.routeI || 0, bd = 1e9; for (let i = U.routeI || 0; i < Math.min(U.route.length, (U.routeI || 0) + 8); i++) { const d = Math.hypot(W.nx[U.route[i]] - pl.pos.x, W.nz[U.route[i]] - pl.pos.z); if (d < bd) { bd = d; bi = i; } } U.routeI = Math.min(U.route.length - 1, bi + (bd < 14 ? 1 : 0)); } }
  // ---------- big map ----------
  const M = { x: 0, z: 0, zoom: 0.35, drag: null };
  function initMap() {
    const c = el.mapc; M.ctx = c.getContext('2d');
    c.addEventListener('mousedown', e => { M.drag = { x: e.clientX, y: e.clientY, moved: 0, b: e.button }; });
    addEventListener('mouseup', e => { if (!U.mapOpen || !M.drag) return; const d = M.drag; M.drag = null; if (d.moved > 5) return; if (d.b === 2) { U.setWaypoint(null); return; } const wx = M.x + (e.clientX - innerWidth / 2) / M.zoom, wz = M.z + (e.clientY - innerHeight / 2) / M.zoom; if (U.waypoint && Math.hypot(U.waypoint.x - wx, U.waypoint.z - wz) * M.zoom < 14) U.setWaypoint(null); else { const hit = hover(e.clientX, e.clientY); const t = hit ? { x: hit.rx != null && hit.rx !== undefined ? hit.rx : (hit.sx !== undefined ? hit.sx : hit.x), z: hit.rz != null && hit.rz !== undefined ? hit.rz : (hit.sz !== undefined ? hit.sz : hit.z) } : { x: wx, z: wz }; U.setWaypoint({ x: G.clamp(t.x, W.bounds.minX, W.bounds.maxX), z: G.clamp(t.z, W.bounds.minZ, W.bounds.maxZ) }); if (G.audio) G.audio.blip(0); } });
    addEventListener('mousemove', e => { if (!U.mapOpen) return; if (M.drag) { M.x -= e.movementX / M.zoom; M.z -= e.movementY / M.zoom; M.drag.moved += Math.abs(e.movementX) + Math.abs(e.movementY); } const hit = hover(e.clientX, e.clientY), t = el.maptip; if (hit) { t.style.display = 'block'; t.style.left = e.clientX + 14 + 'px'; t.style.top = e.clientY + 12 + 'px'; t.textContent = (hit.c === 'vip' ? (G.BOYS[+hit.n].name + ' (' + (G.BOYS[+hit.n].army ? 'bungalow' : 'duplex') + ')') : hit.n) + (G.props.CAT[hit.c] ? '  ·  ' + G.props.CAT[hit.c].label.toLowerCase() : ''); } else t.style.display = 'none'; });
    c.addEventListener('wheel', e => { const k = e.deltaY < 0 ? 1.2 : 1 / 1.2, wx = M.x + (e.clientX - innerWidth / 2) / M.zoom, wz = M.z + (e.clientY - innerHeight / 2) / M.zoom; M.zoom = G.clamp(M.zoom * k, 0.1, 5); M.x = wx - (e.clientX - innerWidth / 2) / M.zoom; M.z = wz - (e.clientY - innerHeight / 2) / M.zoom; }, { passive: true });
  }
  const blipLevel = () => M.zoom > 1.6 ? 3 : M.zoom > 0.6 ? 2 : M.zoom > 0.22 ? 1 : 0;
  function hover(mx, my) { const wx = M.x + (mx - innerWidth / 2) / M.zoom, wz = M.z + (my - innerHeight / 2) / M.zoom, lvl = blipLevel(), r = 13 / M.zoom; let best = null, bd = r; for (const p of U.blipPois) { if (G.props.CAT[p.c].blip > lvl || (p.c === 'vip' && !G.boysUnlocked)) continue; const d = Math.hypot(p.x - wx, p.z - wz); if (d < bd) { bd = d; best = p; } } if (lvl >= 1) for (const s of W.stops) { const d = Math.hypot(s.sx - wx, s.sz - wz); if (d < bd) { bd = d; best = s; } } return best; }
  U.toggleMap = function (on) {
    if (on === undefined) on = !U.mapOpen; if (on === U.mapOpen) return; U.mapOpen = on; el.mapv.classList.toggle('hidden', !on); refreshBlocking();
    if (on) { unlock(); const pl = G.player, ip = pl.mode === 'interior' ? G.game.intPos : pl.pos; M.x = ip.x; M.z = ip.z; M.zoom = 0.5; if (!el.legend.innerHTML) { let h = '<h3>Dhaka Cantonment</h3>'; for (const k of ['home', 'vip', 'gunshop', 'cardealer', 'garage', 'fuel', 'hospital', 'police', 'clothes', 'barber', 'bus', 'food', 'pharmacy', 'bank', 'mosque', 'hotel', 'store', 'tea']) { const c = G.props.CAT[k]; h += `<div><i>${c.icon}</i> ${c.label.charAt(0) + c.label.slice(1).toLowerCase()}</div>`; } h += '<div><i style="color:#b56cf5">●</i> Waypoint and GPS route</div><div><i style="color:#f5c542">●</i> Mission or job</div><div style="opacity:.55;font-size:11px;margin-top:6px">© OpenStreetMap contributors</div>'; el.legend.innerHTML = h; } }
    else if (!U.blocking) lock();
  };
  function drawBigMap() {
    const c = el.mapc, dpr = Math.min(devicePixelRatio || 1, 2), w = innerWidth, h = innerHeight; if (c.width !== w * dpr || c.height !== h * dpr) { c.width = w * dpr; c.height = h * dpr; }
    const x = M.ctx, b = W.bounds, S = U.S, pl = G.player, ip = pl.mode === 'interior' ? G.game.intPos : pl.pos; x.setTransform(dpr, 0, 0, dpr, 0, 0); x.fillStyle = '#14171b'; x.fillRect(0, 0, w, h);
    const sx = v => (v - M.x) * M.zoom + w / 2, sz = v => (v - M.z) * M.zoom + h / 2;
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(U.base, sx(b.minX), sz(b.minZ), (b.maxX - b.minX) * M.zoom, (b.maxZ - b.minZ) * M.zoom);
    x.strokeStyle = 'rgba(120,200,140,.55)'; x.lineWidth = 2; x.setLineDash([8, 6]); for (const cp of W.cantt) { x.beginPath(); const r = cp.r; x.moveTo(sx(r[0]), sz(r[1])); for (let i = 2; i < r.length; i += 2) x.lineTo(sx(r[i]), sz(r[i + 1])); x.closePath(); x.stroke(); } x.setLineDash([]);
    if (M.zoom > 0.3) for (const R of G.traffic.routes) { x.strokeStyle = R.color; x.globalAlpha = 0.5; x.lineWidth = 3; x.beginPath(); R.nodes.forEach((n, i) => { if (i) x.lineTo(sx(W.nx[n]), sz(W.nz[n])); else x.moveTo(sx(W.nx[n]), sz(W.nz[n])); }); x.stroke(); x.globalAlpha = 1; }
    if (U.route) { x.strokeStyle = '#b56cf5'; x.lineWidth = 5; x.lineJoin = 'round'; x.beginPath(); x.moveTo(sx(ip.x), sz(ip.z)); for (let i = U.routeI || 0; i < U.route.length; i++) x.lineTo(sx(W.nx[U.route[i]]), sz(W.nz[U.route[i]])); x.stroke(); }
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if (M.zoom > 0.55) { x.font = '600 12px "Segoe UI",sans-serif'; x.lineWidth = 3; x.strokeStyle = 'rgba(0,0,0,.75)'; x.fillStyle = '#e6e8ea'; for (const l of U.roadLabels) { const px = sx(l.x), py = sz(l.z); if (px < -100 || px > w + 100 || py < -30 || py > h + 30) continue; x.save(); x.translate(px, py); x.rotate(l.a); x.strokeText(l.n, 0, 0); x.fillText(l.n, 0, 0); x.restore(); } }
    if (M.zoom > 1.3) { x.font = '600 11px "Segoe UI",sans-serif'; x.fillStyle = '#cfd3d8'; x.lineWidth = 3; for (const [bi, n] of W.bnames) { const bd = W.buildings[bi], px = sx(bd.cx), py = sz(bd.cz); if (px < 0 || px > w || py < 0 || py > h) continue; x.strokeText(n, px, py); x.fillText(n, px, py); } }
    const lvl = blipLevel(), isz = 11;
    for (const p of U.blipPois) { const cat = G.props.CAT[p.c]; if (cat.blip > lvl || (p.c === 'vip' && !G.boysUnlocked)) continue; const px = sx(p.x), py = sz(p.z); if (px < -20 || px > w + 20 || py < -20 || py > h + 20) continue; icon(0, x, px, py, cat.icon, cat.col, cat.blip === 0 ? isz + 2 : isz); }
    if (lvl >= 1) for (const s of W.stops) icon(0, x, sx(s.sx), sz(s.sz), '🚌', '#1565c0', isz);
    x.lineWidth = 4; x.strokeStyle = 'rgba(0,0,0,.8)'; for (const p of W.places) { if (!p.k && M.zoom < 0.3) continue; x.font = (p.k ? '800 17px' : '700 14px') + ' "Segoe UI",sans-serif'; x.fillStyle = p.k ? '#ffe9a8' : '#ffffff'; const px = sx(p.x), py = sz(p.z); x.strokeText(p.n.toUpperCase(), px, py); x.fillText(p.n.toUpperCase(), px, py); }
    if (G.net.active) { x.font = '700 13px "Segoe UI",sans-serif'; x.lineWidth = 3; x.strokeStyle = 'rgba(0,0,0,.85)'; for (const r of G.net.remotes.values()) { if (!r.buf.length) continue; const px = sx(r.x), py = sz(r.z); icon(0, x, px, py, '', '#4fc3f7', 8); x.fillStyle = '#bfe9ff'; x.strokeText(r.name, px, py - 15); x.fillText(r.name, px, py - 15); } }
    for (const m of U.markers) icon(0, x, sx(m.x), sz(m.z), m.icon || '', m.col || '#f5c542', 15);
    if (U.waypoint) { icon(0, x, sx(U.waypoint.x), sz(U.waypoint.z), '', '#b56cf5', 11); }
    arrow(x, sx(ip.x), sz(ip.z), Math.PI - pl.heading, 15, '#ffffff');
  }
  // ---------- shop menu ----------
  const val = v => typeof v === 'function' ? v() : v;
  U.openMenu = function (def) { if (!def.items.length) return; U.menu = def; U.menuIdx = 0; el.shop.classList.remove('hidden'); unlock(); renderMenu(); refreshBlocking(); if (G.audio) G.audio.blip(0); };
  function renderMenu() { const d = U.menu; el.shopT.textContent = d.title; el.shopS.textContent = val(d.sub) || ''; el.shopI.innerHTML = ''; d.items.forEach((it, i) => { const r = document.createElement('div'); r.className = 'item' + (i === U.menuIdx ? ' sel' : ''); const pr = val(it.price); if (it.icon) { const im = document.createElement('img'); im.src = it.icon; r.appendChild(im); } const b = document.createElement('b'); b.textContent = val(it.label); r.appendChild(b); const p = document.createElement('span'); p.className = 'pr'; p.textContent = pr ? G.taka(pr) : ''; r.appendChild(p); if (it.desc) { const s = document.createElement('small'); s.textContent = it.desc; r.appendChild(s); } r.onclick = () => menuGo(i); r.onmouseenter = () => { U.menuIdx = i; for (const q of el.shopI.children) q.classList.remove('sel'); r.classList.add('sel'); }; el.shopI.appendChild(r); }); }
  function menuSel(d) { const n = U.menu.items.length; U.menuIdx = (U.menuIdx + d + n) % n; renderMenu(); const s = el.shopI.children[U.menuIdx]; if (s) s.scrollIntoView({ block: 'nearest' }); }
  function menuGo(i) { const it = U.menu.items[i]; if (!it) return; U.menuIdx = i; it.fn(); if (U.menu) { const st = el.shopI.scrollTop; renderMenu(); el.shopI.scrollTop = st; } }
  U.closeMenu = function () { if (!U.menu) return; U.menu = null; el.shop.classList.add('hidden'); refreshBlocking(); if (!U.blocking) lock(); };
  // ---------- wardrobe ----------
  const O = () => G.Char.OPTS;
  function wardRows(mode) {
    const o = O(), cols = o.colors, R = [];
    const body = [{ k: 'sex', n: 'Body', v: ['m', 'f'], names: ['Male', 'Female'] }, { k: 'skin', n: 'Skin tone', v: o.skin.map((_, i) => i), sw: o.skin }, { k: 'height', n: 'Height', v: [0.92, 0.96, 1, 1.04, 1.08], names: ['Short', 'Below average', 'Average', 'Tall', 'Very tall'] }, { k: 'build', n: 'Build', v: [0.93, 1, 1.07], names: ['Slim', 'Medium', 'Broad'] }, { k: 'fat', n: 'Weight', v: [0, 0.3, 0.6, 0.9], names: ['Fit', 'Soft', 'Heavy', 'Very heavy'] }];
    const hair = [{ k: 'hair', n: 'Hair style', v: o.hair.map((_, i) => i), names: o.hair }, { k: 'hairCol', n: 'Hair colour', v: o.hairCol.map((_, i) => i), sw: o.hairCol }, { k: 'beard', n: 'Facial hair', v: [0, 1, 2, 3], names: o.beard }];
    const tops = mode === 'clothes' ? o.top.filter(t => !['army', 'navy', 'police', 'rab'].includes(t)) : mode === 'create' ? o.top.filter(t => !['army', 'navy', 'police', 'rab', 'burqa'].includes(t)) : o.top;
    const cl = [{ k: 'top', n: 'Top', v: tops, names: tops.map(t => o.topName[t]) }, { k: 'topCol', n: 'Top colour', v: cols, sw: cols }, { k: 'bottom', n: 'Bottom', v: o.bottom, names: o.bottom.map(t => o.bottomName[t]) }, { k: 'botCol', n: 'Bottom colour', v: cols, sw: cols }, { k: 'shoes', n: 'Shoes', v: cols, sw: cols }, { k: 'hat', n: 'Headwear', v: o.hat, names: o.hat.map(t => o.hatName[t]) }, { k: 'hatCol', n: 'Headwear colour', v: cols, sw: cols }, { k: 'glasses', n: 'Eyewear', v: [0, 1, 2], names: o.glasses }];
    if (mode === 'create' || mode === 'full') R.push(...body); if (mode !== 'clothes') R.push(...hair); if (mode !== 'barber') R.push(...cl); return R;
  }
  U.openWardrobe = function (mode, cost, done) {
    const pl = G.player; U.ward = { mode, cost: cost || 0, done, orig: Object.assign({}, pl.ch.app), rows: wardRows(mode) };
    if (pl.mode === 'interior' && mode !== 'create') { const I = G.interior; pl.heading = I.wardFace !== undefined ? I.wardFace : Math.atan2(-pl.pos.x, -pl.pos.z); I.wardFace = undefined; pl.speed = 0; } U.closeMenu(); el.wardrobe.classList.remove('hidden'); unlock();
    el.wardT.textContent = mode === 'create' ? 'Create your character' : mode === 'barber' ? 'Salon' : mode === 'clothes' ? 'Clothing' : 'Wardrobe'; el.wardS.textContent = mode === 'create' ? 'This is who you will be on the streets of Dhaka' : cost ? 'Costs ' + G.taka(cost) + ' when you confirm' : 'Free at home'; el.wardOk.textContent = mode === 'create' ? 'Start game' : cost ? 'Buy (' + G.taka(cost) + ')' : 'Confirm';
    el.wardCancel.classList.toggle('hidden', mode === 'create'); el.wardI.innerHTML = '';
    if (mode === 'create') { const d = document.createElement('div'); d.className = 'row'; d.style.gridTemplateColumns = '118px 1fr'; d.innerHTML = '<span>Name</span>'; const i = document.createElement('input'); i.type = 'text'; i.maxLength = 22; i.value = G.state.name || 'Rafi'; i.oninput = () => { G.state.name = i.value.trim() || 'Rafi'; }; d.appendChild(i); el.wardI.appendChild(d); }
    for (const r of U.ward.rows) { const d = document.createElement('div'); d.className = 'row'; const s = document.createElement('span'); s.textContent = r.n; const a = document.createElement('button'); a.textContent = '◀'; const e = document.createElement('em'); const bb = document.createElement('button'); bb.textContent = '▶'; d.append(s, a, e, bb); el.wardI.appendChild(d);
      const show = () => { const cur = pl.ch.app[r.k]; let i = r.v.indexOf(cur); if (i < 0) i = 0; e.innerHTML = ''; if (r.sw) { const sw = document.createElement('i'); sw.style.background = r.sw[i]; e.appendChild(sw); } else e.textContent = r.names ? r.names[i] : cur; return i; };
      const step = dir => { const i = show(); const ni = (i + dir + r.v.length) % r.v.length; pl.ch.app[r.k] = r.v[ni]; if (r.k === 'sex') { if (r.v[ni] === 'f') { pl.ch.app.beard = 0; if (pl.ch.app.hair < 4) pl.ch.app.hair = 4; } } pl.ch.rebuild(); show(); if (G.audio) G.audio.click(); };
      a.onclick = () => step(-1); bb.onclick = () => step(1); show(); }
    G.cam.frontYaw = mode === 'create' ? Math.PI : pl.heading + Math.PI; G.cam.front = true; refreshBlocking();
  };
  function wardDone(ok) { const w = U.ward, pl = G.player; if (!w) return; if (ok && w.cost) { if (pl.money < w.cost) { U.notify('Not enough cash', '#e5484d'); ok = false; } else { pl.money -= w.cost; G.audio.buy(); } } if (!ok && w.mode !== 'create') { pl.ch.app = w.orig; pl.ch.rebuild(); } else { G.state.app = Object.assign({}, pl.ch.app); if (G.net.active) G.net.pushMeta().catch(() => { }); } U.ward = null; el.wardrobe.classList.add('hidden'); G.cam.front = false; refreshBlocking(); if (!U.blocking) lock(); if (w.done) w.done(ok); }
  // ---------- weapon wheel ----------
  function wheelUpdate(dt) {
    const In = G.input, pl = G.player, open = In.keys.Tab && !U.blocking && pl.mode !== 'bus' && !pl.dead && G.running;
    if (open && !U.wheelOpen) { U.wheelOpen = true; U.wv = [0, 0]; const own = G.Weapons.ORDER.filter(id => pl.inv[id]); U.wown = own; U.wsel = own.indexOf(pl.weapon); let h = ''; const R = Math.min(innerHeight * 0.34, 300); own.forEach((id, i) => { const a = i / own.length * 6.283 - Math.PI / 2, d = G.Weapons.DEFS[id], st = pl.inv[id]; h += `<div class="w" data-i="${i}" style="left:calc(50% + ${Math.cos(a) * R}px);top:calc(50% + ${Math.sin(a) * R}px)"><img src="${G.Weapons.icons[id]}" ${id === 'fist' ? 'style="filter:none"' : ''}>${d.name}${d.mag ? ' · ' + (st.clip + st.ammo) : ''}</div>`; }); h += '<div class="c"></div>'; el.wheel.innerHTML = h; el.wheel.classList.remove('hidden'); }
    if (U.wheelOpen) { U.wv[0] = G.clamp(U.wv[0] + In.mdx, -120, 120); U.wv[1] = G.clamp(U.wv[1] + In.mdy, -120, 120); if (Math.hypot(U.wv[0], U.wv[1]) > 30) { let a = Math.atan2(U.wv[1], U.wv[0]) + Math.PI / 2; if (a < 0) a += 6.283; U.wsel = Math.round(a / 6.283 * U.wown.length) % U.wown.length; } if (In.wheel) U.wsel = (U.wsel + In.wheel + U.wown.length) % U.wown.length;
      el.wheel.querySelectorAll('.w').forEach((n, i) => n.classList.toggle('sel', i === U.wsel)); const d = G.Weapons.DEFS[U.wown[U.wsel]]; el.wheel.querySelector('.c').innerHTML = d.name + '<small>' + (d.mag ? pl.inv[d.id].clip + ' / ' + pl.inv[d.id].ammo : 'melee') + '</small>';
      if (!open) { U.wheelOpen = false; el.wheel.classList.add('hidden'); if (U.wown[U.wsel] !== pl.weapon) pl.selectWeapon(U.wown[U.wsel]); } }
    return U.wheelOpen;
  }
  // ---------- pause / settings ----------
  const TABS = {
    settings: () => { const s = G.settings; return `<div class="set"><span>Graphics quality</span><select id="sQ"><option value="0">Low (fastest)</option><option value="1">Medium</option><option value="2">High</option></select><span></span></div>
      <div class="set"><span>Master volume</span><input type="range" id="sV" min="0" max="100" value="${Math.round(s.volume * 100)}"><span id="sVv">${Math.round(s.volume * 100)}%</span></div>
      <div class="set"><span>Mouse sensitivity</span><input type="range" id="sM" min="20" max="250" value="${Math.round(s.sens * 100)}"><span id="sMv">${Math.round(s.sens * 100)}%</span></div>
      <div class="set"><span>Traffic density</span><input type="range" id="sT" min="0" max="200" value="${Math.round(s.traffic * 100)}"><span id="sTv">${Math.round(s.traffic * 100)}%</span></div>
      <div class="set"><span>Pedestrian density</span><input type="range" id="sP" min="0" max="200" value="${Math.round(s.peds * 100)}"><span id="sPv">${Math.round(s.peds * 100)}%</span></div>
      <div class="set"><span>Invert mouse Y</span><select id="sI"><option value="0">Off</option><option value="1">On</option></select><span></span></div>
      <p class="hint">Low quality turns off shadows and bloom and shortens the view distance. Use it if the game feels slow.</p>`; },
    world: () => { if (G.net.active) return '<p class="tag">Weather and time are shared by everyone on the server, so they cannot be changed here. One game day lasts 48 minutes.</p>'; let o = ''; for (const k in G.env.WEATHER) o += `<option value="${k}">${G.env.WEATHER[k].label}</option>`; return `<div class="set"><span>Weather</span><select id="wW">${o}</select><span></span></div><div class="set"><span>Automatic weather changes</span><select id="wA"><option value="1">On</option><option value="0">Off (keep chosen weather)</option></select><span></span></div><div class="set"><span>Time of day</span><input type="range" id="wT" min="0" max="2399" value="${Math.round(G.env.time * 100)}"><span id="wTv">${G.env.clock()}</span></div><div class="set"><span>Clock speed</span><select id="wS"><option value="1">Normal (1 game hour = 2 minutes)</option><option value="0">Frozen</option><option value="6">Fast</option></select><span></span></div><p class="hint">Dhaka seasons in one place: monsoon rain, Kalboishakhi storms with lightning, winter fog and dusty haze. Rain makes roads slippery and reflective.</p>`; },
    controls: () => { const K = [['W A S D', 'Move / drive'], ['Mouse', 'Look around'], ['Shift', 'Sprint'], ['Space', 'Jump / handbrake'], ['F', 'Enter or exit vehicle'], ['E', 'Interact, enter doors, board bus'], ['Left mouse', 'Shoot / punch'], ['Right mouse', 'Aim'], ['R', 'Reload'], ['Tab (hold)', 'Weapon wheel'], ['1 to 9, scroll', 'Switch weapon'], ['M', 'Open map, set waypoint'], ['H', 'Horn (vehicle) / first aid (on foot)'], ['L', 'Headlights'], ['Q', 'Siren (emergency vehicles)'], ['V', 'Change camera'], ['J', 'Start a job in taxi, CNG, bus or bike'], ['C or Alt', 'Walk slowly'], ['F5', 'Quick save'], ['Esc or P', 'Pause']]; return '<div class="keys">' + K.map(k => `<kbd>${k[0]}</kbd><span>${k[1]}</span>`).join('') + '</div><p class="hint">Bangladesh drives on the left. Hire a CNG, taxi or rickshaw by setting a waypoint on the map and pressing E next to one. Wait at any bus stop and press E to call a bus.</p>'; },
    stats: () => { const s = G.state.stats, pl = G.player; const rows = [['Name', G.state.name], ['Cash', G.taka(pl.money)], ['Bank', G.taka(pl.bank)], ['Day', (G.env.day + 1) + ' (' + G.env.dayName() + ')'], ['Missions completed', Object.keys(G.state.missions).length], ['Distance driven', ((s.driven || 0) / 1000).toFixed(1) + ' km'], ['Distance on foot', ((s.walked || 0) / 1000).toFixed(1) + ' km'], ['Taxi fares', s.fares || 0], ['Deliveries', s.deliveries || 0], ['Bus stops served', s.busStops || 0], ['Robberies', s.robberies || 0], ['Kills', s.kills || 0], ['Times wasted', s.wasted || 0], ['Times busted', s.busted || 0], ['Properties owned', Object.keys(G.state.owned).length], ['Vehicles in garage', G.state.garage.length]]; return '<div class="keys" style="grid-template-columns:200px 1fr">' + rows.map(r => `<span style="opacity:.75">${r[0]}</span><b>${r[1]}</b>`).join('') + '</div>'; }
  };
  function showTab(t) { const m = el.pauseMain; m.innerHTML = TABS[t](); const s = G.settings, on = (id, ev, fn) => { const e = $(id); if (e) e.addEventListener(ev, fn); return e; };
    if (t === 'settings') { $('sQ').value = s.quality; $('sI').value = s.invert ? 1 : 0; on('sQ', 'change', e => { s.quality = +e.target.value; G.applySettings(); }); on('sV', 'input', e => { s.volume = e.target.value / 100; $('sVv').textContent = e.target.value + '%'; G.applySettings(); }); on('sM', 'input', e => { s.sens = e.target.value / 100; $('sMv').textContent = e.target.value + '%'; }); on('sT', 'input', e => { s.traffic = e.target.value / 100; $('sTv').textContent = e.target.value + '%'; G.applySettings(); }); on('sP', 'input', e => { s.peds = e.target.value / 100; $('sPv').textContent = e.target.value + '%'; G.applySettings(); }); on('sI', 'change', e => { s.invert = e.target.value === '1'; }); }
    if (t === 'world' && $('wW')) { $('wW').value = G.env.weather; $('wA').value = G.env.auto ? 1 : 0; $('wS').value = G.env.timeScale === 0 ? 0 : G.env.timeScale > 0.01 ? 6 : 1; on('wW', 'change', e => { G.env.setWeather(e.target.value, true); }); on('wA', 'change', e => { G.env.auto = e.target.value === '1'; }); on('wT', 'input', e => { G.env.time = e.target.value / 100; $('wTv').textContent = G.env.clock(); G.env.envT = 99; }); on('wS', 'change', e => { G.env.timeScale = e.target.value === '0' ? 0 : e.target.value === '6' ? 1 / 20 : 1 / 120; }); } }
  function initPause() {
    el.pause.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.tab) showTab(b.dataset.tab); const a = b.dataset.act; if (a === 'resume') U.pause(false); if (a === 'map') { U.pause(false, true); U.toggleMap(true); } if (a === 'save') { if (G.game.save(true)) U.notify('Game saved', '#58d26b'); U.pause(false); } if (a === 'boys') { U.pause(false, true); U.openBoys(); } if (a === 'mp') { U.pause(false, true); U.openMP(true); } if (a === 'quit') { U.pause(false, true); G.game.toMenu(); } });
    el.mNew.onclick = () => G.game.newGame(); el.mContinue.onclick = () => G.game.continueGame(); el.mBoys.onclick = () => U.openBoys(); el.mMulti.onclick = () => U.openMP(false); el.mSettings.onclick = () => { U.pause(true); showTab('controls'); };
  }
  U.pause = function (on, keepUnlocked) { if (on === U.paused) return; if (on && (U.menu || U.ward || U.boysOpen)) return; U.paused = on; el.pause.classList.toggle('hidden', !on); if (on) { unlock(); showTab('settings'); } refreshBlocking(); if (!on && !keepUnlocked && !U.blocking) lock(); if (!on) G.saveSettings(); };
  U.showMainMenu = function (on) { U.mainMenu = on; el.menu.classList.toggle('hidden', !on); el.mContinue.classList.toggle('hidden', !G.game.hasSave()); refreshBlocking(); if (on) unlock(); };
  // ---------- Boys Club ----------
  const QUESTIONS = ['What was the name of your first school?', 'What is your favourite food?', 'Which area did you grow up in?', 'What was your first phone?', 'What is the name of your best childhood friend?'];
  U.openBoys = function () {
    U.boysOpen = true; el.boys.classList.remove('hidden'); unlock(); refreshBlocking(); const body = el.boysBody, A = G.boyAuth;
    const close = () => { U.boysOpen = false; el.boys.classList.add('hidden'); refreshBlocking(); if (!U.blocking) lock(); };
    const stop = n => n.addEventListener('keydown', e => e.stopPropagation());
    if (!G.boysUnlocked) { body.innerHTML = '<p class="tag" style="margin:6px 0 14px">This part of the game is locked. Enter the members password to unlock the Boys Club characters, their houses in the Cantonment and the signature Boys Whip.</p><div style="display:flex;gap:8px;max-width:520px"><input type="password" id="bpw" placeholder="Password" autocomplete="off"><button class="btn go" id="bgo" style="white-space:nowrap">Unlock</button><button class="btn" id="bcl">Close</button></div><p class="hint" id="bmsg"></p>';
      const go = () => { if (G.boys.tryUnlock($('bpw').value)) { if (G.audio) { G.audio.init(); G.audio.mission(true); } U.openBoys(); } else { $('bmsg').textContent = 'Wrong password. Boys only.'; $('bmsg').style.color = '#e5484d'; if (G.audio) G.audio.blip(3); } };
      $('bgo').onclick = go; $('bcl').onclick = close; $('bpw').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') go(); }); setTimeout(() => $('bpw').focus(), 30); return; }
    const start = i => { close(); if (G.audio) G.audio.init(); G.game.playAsBoy(i); };
    const roster = () => {
      let h = '<p class="tag" style="margin:6px 0 0">Pick who you are. Each member sets a personal password the first time, and progress is saved to that member. Everyone gets the <b style="color:#f5c542">Boys Whip</b> at their own house in the Cantonment.' + (G.net.pendingRoom ? ' You will join the multiplayer server <b>' + G.net.pendingRoom + '</b>.' : '') + '</p><div class="roster">';
      G.BOYS.forEach((b, i) => { const cars = ['Boys Whip'].concat(b.cars.map(c => G.Veh.DEFS[c].name)); if (b.boat) cars.push('Navy Patrol Boat'); const home = G.boys.homeType(i); h += `<button class="boy" data-i="${i}"><i id="bst${i}"></i><b>${b.name}</b><small>${b.role}</small><em>${home.charAt(0).toUpperCase() + home.slice(1)} · ${cars.join(', ')}</em></button>`; });
      h += '</div><div class="btnrow" style="max-width:260px"><button class="btn" id="bcl">Close</button></div>'; body.innerHTML = h; $('bcl').onclick = () => { G.net.pendingRoom = null; close(); };
      body.querySelectorAll('.boy').forEach(n => n.onclick = () => pick(+n.dataset.i));
      G.BOYS.forEach((b, i) => A.status(i).then(st => { const e = $('bst' + i); if (e) e.textContent = st.claimed ? (A.session[i] ? '● signed in' : '🔒 has password') : 'new'; }));
    };
    const form = (i, st, mode, note) => {
      const b = G.BOYS[i]; let h = `<p class="tag" style="margin:6px 0 2px"><b style="font-size:19px">${b.name}</b><br>${b.role}</p>`;
      if (mode === 'create') h += '<p class="tag" style="margin:4px 0">First time as this character. Create your own password. Only you will be able to play as ' + b.name.split(' ')[0] + ' after this.</p><div class="form"><label>Password (at least 4 characters)</label><input type="password" id="f1" autocomplete="new-password"><label>Repeat password</label><input type="password" id="f2" autocomplete="new-password"><label>Security question, used if you forget the password</label><select id="fq">' + QUESTIONS.map(x => `<option>${x}</option>`).join('') + '</select><label>Your answer</label><input type="text" id="fa" autocomplete="off"></div>';
      else if (mode === 'login') h += '<div class="form"><label>Your password</label><input type="password" id="f1" autocomplete="current-password"></div>';
      else h += '<p class="tag" style="margin:4px 0">Answer your security question to set a new password.</p><div class="form"><label>' + (st.q || 'Security question') + '</label><input type="text" id="fa" autocomplete="off"><label>New password (at least 4 characters)</label><input type="password" id="f1" autocomplete="new-password"></div>';
      h += '<p class="msg' + (note ? ' bad' : '') + '" id="fm">' + (note || (st.cloud ? '' : 'Offline: this password is kept on this device only.')) + '</p><div class="btnrow" style="max-width:460px"><button class="btn" id="fb">Back</button>' + (mode === 'login' ? '<button class="btn" id="ff">Forgot password</button>' : '') + '<button class="btn go" id="fg">' + (mode === 'create' ? 'Create and play' : mode === 'login' ? 'Sign in and play' : 'Reset and play') + '</button></div>';
      body.innerHTML = h; body.querySelectorAll('input,select').forEach(stop); $('fb').onclick = roster; if ($('ff')) $('ff').onclick = () => form(i, st, 'forgot');
      const msg = (t, ok) => { const m = $('fm'); m.textContent = t; m.className = 'msg ' + (ok ? 'ok' : 'bad'); };
      const go = async () => { const pw = $('f1').value; if (pw.length < 4) return msg('Password needs at least 4 characters.'); $('fg').disabled = true; msg('Checking...', true); let r;
        if (mode === 'create') { if (pw !== $('f2').value) { $('fg').disabled = false; return msg('The two passwords do not match.'); } if ($('fa').value.trim().length < 2) { $('fg').disabled = false; return msg('Please answer the security question.'); } r = await A.create(i, pw, $('fq').value, $('fa').value); }
        else if (mode === 'login') r = await A.login(i, pw); else r = await A.reset(i, $('fa').value, pw);
        if (r.ok) start(i); else { if ($('fg')) $('fg').disabled = false; msg(r.why || 'That did not work.'); if (G.audio) G.audio.blip(3); } };
      $('fg').onclick = go; body.querySelectorAll('input').forEach(n => n.addEventListener('keydown', e => { if (e.key === 'Enter') go(); })); setTimeout(() => { const f = body.querySelector('input'); if (f) f.focus(); }, 30);
    };
    const pick = async i => { body.innerHTML = '<p class="tag">Checking ' + G.BOYS[i].name + '...</p>'; const st = await A.status(i);
      if (st.claimed && A.session[i]) { const r = await A.login(i, null, A.session[i]); if (r.ok) return start(i); }
      form(i, st, st.claimed ? 'login' : 'create'); };
    roster();
  };
  // ---------- multiplayer dialog, chat, player list ----------
  U.openMP = function (inGame) {
    U.mpOpen = true; el.mp.classList.remove('hidden'); unlock(); refreshBlocking(); const body = el.mpBody, Nt = G.net;
    const close = () => { U.mpOpen = false; el.mp.classList.add('hidden'); refreshBlocking(); if (!U.blocking) lock(); };
    if (Nt.active) { body.innerHTML = `<p class="tag" style="margin:6px 0 12px">You are on server <b>${Nt.room}</b> with ${Nt.remotes.size} other player${Nt.remotes.size === 1 ? '' : 's'}.</p><div class="btnrow" style="max-width:420px"><button class="btn" id="mpc">Close</button><button class="btn go" id="mpl">Leave server</button></div>`; $('mpc').onclick = close; $('mpl').onclick = () => { Nt.leave(); close(); }; return; }
    body.innerHTML = '<p class="tag" style="margin:6px 0 10px">Everyone who enters the same server name plays in the same Dhaka Cantonment, in real time, up to 18 players. You see each other walk, drive and shoot, share the same weather and clock, and can chat. Traffic and pedestrians are simulated separately on each computer.</p><div class="form"><label>Server name (share this with your friends)</label><input type="text" id="mpr" maxlength="20" value="' + (localStorage.getItem('ds_room') || 'dhaka') + '"></div><p class="msg" id="mpm">Checking server...</p><div class="btnrow">' + (inGame ? '<button class="btn" id="mpc">Close</button><button class="btn go" id="mpj">Join now</button>' : '<button class="btn" id="mpc">Close</button><button class="btn" id="mpb">Join as a Boys Club member</button><button class="btn go" id="mpj">Join with my character</button>') + '</div>';
    const room = () => { const r = $('mpr').value.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20) || 'dhaka'; try { localStorage.setItem('ds_room', r); } catch (e) { } return r; };
    $('mpr').addEventListener('keydown', e => e.stopPropagation()); $('mpc').onclick = close;
    G.cloud.connect().then(ok => { const m = $('mpm'); if (!m) return; m.textContent = ok ? 'Server is online.' : 'The multiplayer server cannot be reached right now. You can still play alone.'; m.className = 'msg ' + (ok ? 'ok' : 'bad'); });
    if (inGame) $('mpj').onclick = async () => { $('mpj').disabled = true; $('mpm').textContent = 'Joining...'; const r = await Nt.join(room()); if (r.ok) { close(); U.notify('Connected to server "' + r.room + '". ' + r.count + ' of ' + Nt.max + ' players online.', '#58d26b'); U.notify('Press T to chat, hold Z for the player list.'); } else { $('mpj').disabled = false; $('mpm').textContent = r.why; $('mpm').className = 'msg bad'; } };
    else { $('mpj').onclick = () => { Nt.pendingRoom = room(); close(); if (G.audio) G.audio.init(); if (G.game.hasSave()) G.game.continueGame(); else G.game.newGame(); }; $('mpb').onclick = () => { Nt.pendingRoom = room(); close(); U.openBoys(); }; }
  };
  U.netStatus = function () { const Nt = G.net; el.net.classList.toggle('on', Nt.active); el.notes.classList.toggle('shift', Nt.active); if (Nt.active) el.net.textContent = '● ONLINE  ·  ' + Nt.room + '  ·  ' + (Nt.remotes.size + 1) + ' / ' + Nt.max + (G.cloud.online ? '' : '  ·  reconnecting'); };
  U.chatLine = function (who, text, me, colr) { const d = document.createElement('div'); if (me) d.className = 'me'; if (who) { const b = document.createElement('b'); b.textContent = who; d.appendChild(b); } d.append(text); if (colr) d.style.color = colr; el.chat.appendChild(d); while (el.chat.children.length > 8) el.chat.firstChild.remove(); setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 900); }, 14000); };
  function chatOpen(on) { U.chatOpen = on; el.chatIn.classList.toggle('hidden', !on); refreshBlocking(); if (on) { G.input.keys = {}; el.chatIn.value = ''; setTimeout(() => el.chatIn.focus(), 0); } else el.chatIn.blur(); }
  U.initNet = function () { el.chatIn.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { const t = el.chatIn.value; chatOpen(false); if (t.trim()) G.net.chat(t); } else if (e.key === 'Escape') { e.preventDefault(); chatOpen(false); } }); };
  let netT = 0;
  function netUI(dt) { const Nt = G.net, In = G.input; if (!Nt.active) { if (U.scoreOn) { U.scoreOn = false; el.score.classList.add('hidden'); } return; }
    if (In.hit.KeyT && !U.blocking && G.running) chatOpen(true);
    netT -= dt; if (netT <= 0) { netT = 1; U.netStatus(); }
    const show = !!In.keys.KeyZ && !U.blocking; if (show !== U.scoreOn || (show && netT > 0.97)) { U.scoreOn = show; el.score.classList.toggle('hidden', !show); if (show) { let h = '<h3>Players on ' + Nt.room + '  (' + (Nt.remotes.size + 1) + ' / ' + Nt.max + ')</h3><table><tr><th>Player</th><th class="n">Kills</th><th class="n">Deaths</th></tr>'; for (const p of Nt.players()) { const n = document.createElement('span'); n.textContent = p.name; h += `<tr class="${p.me ? 'me' : ''}"><td>${n.innerHTML}${p.boy >= 0 ? ' 👑' : ''}</td><td class="n">${p.k}</td><td class="n">${p.d}</td></tr>`; } el.score.innerHTML = h + '</table>'; } } }

  // ---------- per-frame ----------
  let hudT = 0, areaT = 0, lastArea = '', lastStreet = '', moneyShown = -1, clockKey = '';
  U.update = function (dt) {
    const pl = G.player, In = G.input;
    if (U.mapOpen) drawBigMap();
    if (!G.running) return false;
    const wheel = wheelUpdate(dt);
    netUI(dt);
    updateRoute(dt);
    if (el.hud.classList.contains('hidden')) return wheel;
    drawMinimap(dt);
    el.hp.style.width = Math.max(0, pl.health / pl.maxHealth * 100) + '%'; el.ar.style.width = Math.max(0, pl.armor) + '%';
    if (moneyShown !== pl.money) { const d = pl.money - moneyShown; moneyShown += Math.abs(d) < 3 ? d : Math.sign(d) * Math.ceil(Math.abs(d) * Math.min(1, dt * 6)); el.money.textContent = G.taka(moneyShown); }
    hudT -= dt; if (hudT <= 0) { hudT = 0.2; const ck = G.env.clock() + G.env.weather; if (ck !== clockKey) { clockKey = ck; el.clock.textContent = G.env.dayName() + '  ' + G.env.clock() + '  ·  ' + G.env.label(); }
      const st = el.stars.children, lv = G.wanted.level; for (let i = 0; i < 5; i++) st[i].className = i < lv ? 'on' : ''; el.stars.className = G.wanted.flash ? 'flash' : ''; el.stars.style.opacity = lv ? 1 : 0.0;
      const d = G.Weapons.DEFS[pl.weapon], s = pl.inv[pl.weapon], ak = pl.weapon + (s ? s.clip + '_' + s.ammo : '') + pl.reloadT; if (ak !== U.ammoKey) { U.ammoKey = ak; el.wammo.textContent = d.mag ? (pl.reloadT > 0 ? 'reloading' : s.clip + ' / ' + s.ammo) : (pl.medkits ? '✚ ' + pl.medkits : ''); }
      const driving = pl.mode === 'vehicle' || pl.mode === 'bus' || pl.mode === 'ride'; el.speedo.classList.toggle('hidden', !driving); if (driving) el.kmh.textContent = Math.round(pl.speed * 3.6); }
    areaT -= dt; if (areaT <= 0 && pl.mode !== 'interior') { areaT = 1; const a = W.placeAt(pl.pos.x, pl.pos.z); const nr = W.nearestRoad(pl.pos.x, pl.pos.z, 30, 8, 0, {}); const s = nr && W.roads[nr.ri].name ? W.roads[nr.ri].name : ''; if (a !== lastArea || (s && s !== lastStreet)) { lastArea = a; if (s) lastStreet = s; el.areaName.textContent = a; el.street.textContent = s || lastStreet; el.area.style.opacity = 1; U.areaShow = 5; } }
    if (U.areaShow > 0) { U.areaShow -= dt; if (U.areaShow <= 0) el.area.style.opacity = 0; }
    if (U.subT > 0) { U.subT -= dt; if (U.subT <= 0) el.sub.style.opacity = 0; }
    if (U.bigT > 0) { U.bigT -= dt; if (U.bigT <= 0) el.big.style.opacity = 0; }
    if (U.promptText && !U.blocking) { if (el.prompt.textContent !== U.promptText) el.prompt.textContent = U.promptText; el.prompt.style.opacity = 1; } else el.prompt.style.opacity = 0; U.promptText = null;
    const d = G.Weapons.DEFS[pl.weapon], showX = !U.blocking && !pl.dead && ((pl.mode === 'foot' || pl.mode === 'interior') ? (pl.aiming || pl.firedT > 0) && d.type !== 'melee' : pl.mode === 'vehicle' && (d.type === 'pistol' || d.type === 'smg') && In.mb[0]);
    const scope = showX && d.scope && pl.aiming; el.cross.style.opacity = showX && !scope ? 0.9 : 0; el.scope.style.opacity = scope ? 1 : 0; U.scoped = scope;
    return wheel;
  };
})();
