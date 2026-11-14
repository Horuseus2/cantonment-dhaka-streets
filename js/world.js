'use strict';
// World: decodes the real map, builds roads/areas/buildings, collision, road graph, chunk streaming.
(function () {
  const G = window.G, GB = G.GB;
  const W = G.world = {};
  const CS = W.CS = 200, BC = 40, FH = W.FH = 3.2;
  const key = (i, j) => (i + 512) * 1024 + (j + 512);
  W.SPEED = [22, 19, 16, 14, 12.5, 9, 6, 5, 12, 2, 1.5]; // m/s by road type
  const WHITE = [1, 1, 1];

  function gridAdd(m, c, x0, z0, x1, z1, v) { for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++) for (let j = Math.floor(z0 / c); j <= Math.floor(z1 / c); j++) { const k = key(i, j); let a = m.get(k); if (!a) m.set(k, a = []); a.push(v); } }

  W.init = async function (scene, progress) {
    const M = window.MAPDATA; W.scene = scene; W.bounds = M.bounds;
    // ----- nodes & roads -----
    const nn = W.nn = M.nodes.length / 3; const nx = W.nx = new Float32Array(nn), nz = W.nz = new Float32Array(nn), nh = W.nh = new Float32Array(nn);
    for (let i = 0; i < nn; i++) { nx[i] = M.nodes[i * 3] / 10; nz[i] = M.nodes[i * 3 + 1] / 10; nh[i] = M.nodes[i * 3 + 2] / 10; }
    const roads = W.roads = M.roads.map(a => ({ t: a[0], w: a[1], o: a[2], L: a[3], name: a[4], k: a[5] }));
    W.adjD = new Array(nn); W.adjP = new Array(nn); W.deg = new Uint8Array(nn); const discR = new Float32Array(nn);
    W.segGrid = new Map(); W.decks = []; W.deckGrid = new Map();
    roads.forEach((r, ri) => {
      r.elev = false;
      for (let i = 0; i < r.k.length; i++) { const a = r.k[i]; if (nh[a] > 0.3) r.elev = true; if (r.t < 9) { W.deg[a]++; discR[a] = Math.max(discR[a], r.w / 2); } }
      for (let i = 0; i + 1 < r.k.length; i++) {
        const a = r.k[i], b = r.k[i + 1], len = Math.hypot(nx[a] - nx[b], nz[a] - nz[b]); if (len < 0.01) continue;
        if (r.t < 9) { (W.adjD[a] || (W.adjD[a] = [])).push(b, len, ri); if (!r.o) (W.adjD[b] || (W.adjD[b] = [])).push(a, len, ri); }
        if (r.t !== 0) { (W.adjP[a] || (W.adjP[a] = [])).push(b, len, ri); (W.adjP[b] || (W.adjP[b] = [])).push(a, len, ri); }
        gridAdd(W.segGrid, 50, Math.min(nx[a], nx[b]), Math.min(nz[a], nz[b]), Math.max(nx[a], nx[b]), Math.max(nz[a], nz[b]), ri * 4096 + i);
        if (nh[a] > 0.3 || nh[b] > 0.3) { const d = { ax: nx[a], az: nz[a], ah: nh[a], bx: nx[b], bz: nz[b], bh: nh[b], hw: r.w / 2, foot: r.t >= 9 }; W.decks.push(d); gridAdd(W.deckGrid, 50, Math.min(d.ax, d.bx) - d.hw, Math.min(d.az, d.bz) - d.hw, Math.max(d.ax, d.bx) + d.hw, Math.max(d.az, d.bz) + d.hw, d); }
      }
    });
    W.discR = discR;
    progress(0.08, 'Reading 35,000 buildings');
    await G.frame();
    // ----- buildings -----
    const B = W.buildings = new Array(M.buildings.length); W.bGrid = new Map(); W.chunkB = new Map();
    for (let bi = 0; bi < B.length; bi++) {
      const a = M.buildings[bi], r = G.decodeRing(a, 3); let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, cx = 0, cz = 0; const n = r.length / 2;
      for (let i = 0; i < n; i++) { const x = r[i * 2], z = r[i * 2 + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z; cx += x; cz += z; }
      const b = B[bi] = { f: a[0], s: a[1], shop: a[2], r, x0, x1, z0, z1, cx: cx / n, cz: cz / n, h: a[1] === 2 ? 2.7 : a[0] * FH };
      gridAdd(W.bGrid, BC, x0, z0, x1, z1, bi);
      const ck = key(Math.floor(b.cx / CS), Math.floor(b.cz / CS)); let l = W.chunkB.get(ck); if (!l) W.chunkB.set(ck, l = []); l.push(bi);
    }
    W.bnames = M.bnames; W._stamp = 0; W._stamps = new Int32Array(B.length);
    W.circGrid = new Map();
    // ----- zones -----
    W.cantt = M.cantt.map(a => { const r = G.decodeRing(a, 0); let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < r.length; i += 2) { x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); z0 = Math.min(z0, r[i + 1]); z1 = Math.max(z1, r[i + 1]); } return { r, x0, x1, z0, z1 }; });
    W.places = M.places.map(p => ({ n: p.n, x: p.x / 10, z: p.z / 10, k: p.k }));
    W.areas = M.areas.map(a => { const r = G.decodeRing(a[2], 0); let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < r.length; i += 2) { x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); z0 = Math.min(z0, r[i + 1]); z1 = Math.max(z1, r[i + 1]); } return { t: a[0], n: a[1], r, x0, x1, z0, z1 }; });
    W.waterGrid = new Map(); W.areas.forEach(a => { if (a.t === 'water') gridAdd(W.waterGrid, 100, a.x0, a.z0, a.x1, a.z1, a); });
    W.pois = M.pois.map((p, i) => ({ id: i, c: p[0], n: p[1], x: p[2] / 10, z: p[3] / 10, a: p[4] / 100, b: p[5], kiosk: p[6], rx: p[7] !== undefined ? p[7] / 10 : null, rz: p[8] !== undefined ? p[8] / 10 : null }));
    W.poiGrid = new Map(); W.pois.forEach(p => gridAdd(W.poiGrid, 50, p.x, p.z, p.x, p.z, p));
    W.stops = M.stops.map((s, i) => ({ id: i, n: s[0], x: s[1] / 10, z: s[2] / 10, rx: s[3] / 10, rz: s[4] / 10 }));
    W.signals = M.signals.map(s => ({ x: s[0] / 10, z: s[1] / 10 }));
    W.checkpoints = M.checkpoints.map(c => ({ n: c.n, x: c.x / 10, z: c.z / 10, a: c.a / 100, w: c.w }));
    W.rails = M.rails.map(a => G.decodeRing(a, 0));
    progress(0.16, 'Paving real roads');
    await G.frame();
    buildFlat(M);
    progress(0.3, 'Raising flyovers');
    await G.frame();
    buildDecks();
    W.chunks = new Map(); W.queue = []; W.chunkHooks = W.chunkHooks || []; W.viewDist = 900;
    initMaterials();
  };

  // ---------- materials ----------
  function initMaterials() {
    const T = G.T; W.mats = [];
    for (let s = 0; s < 9; s++) {
      const m = new THREE.MeshStandardMaterial({ map: T.facade[s].map, emissiveMap: T.facade[s].em, emissive: 0xffffff, emissiveIntensity: 0, vertexColors: true, roughness: s === 1 ? 0.22 : (s === 2 || s === 5) ? 0.55 : 0.9, metalness: s === 1 ? 0.6 : (s === 2 || s === 5) ? 0.35 : 0 });
      if (s === 1) m.envMapIntensity = 1.3;
      W.mats.push(m);
    }
    W.roofMat = new THREE.MeshStandardMaterial({ map: T.roof, vertexColors: true, roughness: 0.95 });
  }
  const TINT = [
    ['#e8e0cf', '#d9cdb4', '#e6d3c0', '#cfd8d2', '#e0c9c9', '#d6dbe2', '#f0e9d8', '#c9c2b0', '#e3d7a8', '#bfcfc0', '#d8b9a0', '#cfc6d6', '#f2efe6', '#b9c4cc'],
    ['#ffffff', '#dfe9f0', '#cfe0d8', '#e8e0f0', '#c8d0d8', '#f0e6d0'],
    ['#ffffff', '#c9d2d6', '#a9b9c9', '#d9c9b0', '#9fb0a0', '#b0a090'],
    ['#ffffff', '#f6efd9', '#eee2c4', '#e9e9e0'], ['#ffffff', '#f0e0d6', '#e6d0c6', '#d8c8c0'], ['#ffffff', '#d0dae2', '#e0d8c8'], ['#ffffff', '#f4f8f2'], ['#ffffff', '#d8d8d8'], ['#ffffff']];
  const ROOFC = ['#9c9a94', '#8a8882', '#a8a59c', '#7d7b76', '#b0a898', '#8f8a80'];

  // ---------- flat ground layers (painter ordered, no depth writes) ----------
  function flatMat(tex, rep, extra) { const t = tex.clone(); t.needsUpdate = true; if (rep) t.repeat.set(rep, rep); return new THREE.MeshStandardMaterial(Object.assign({ map: t, roughness: 0.95, metalness: 0, depthWrite: false }, extra || {})); }
  function addFlat(geo, mat, order) { const m = new THREE.Mesh(geo, mat); m.renderOrder = order; m.receiveShadow = true; m.matrixAutoUpdate = false; W.scene.add(m); return m; }
  function triangulate(r) { const c = []; for (let i = 0; i < r.length; i += 2) c.push(new THREE.Vector2(r[i], r[i + 1])); let f; try { f = THREE.ShapeUtils.triangulateShape(c, []); } catch (e) { f = []; } return f; }
  W.triangulate = triangulate;
  function polyFlat(gb, r, y, uvs, col) {
    const f = triangulate(r), base = gb.vc;
    for (let i = 0; i < r.length; i += 2) gb.v(r[i], y, r[i + 1], 0, 1, 0, r[i] / uvs, r[i + 1] / uvs, col);
    for (const t of f) { const a = t[0], b = t[1], c = t[2]; const ny = (r[b * 2 + 1] - r[a * 2 + 1]) * (r[c * 2] - r[a * 2]) - (r[b * 2] - r[a * 2]) * (r[c * 2 + 1] - r[a * 2 + 1]); if (ny >= 0) gb.i.push(base + a, base + b, base + c); else gb.i.push(base + a, base + c, base + b); }
  }
  const roadClass = r => r.t === 0 ? 'moto' : r.t === 8 ? 'plain' : r.t <= 4 ? (r.w >= 7 ? (r.o ? 'one' : 'two') : (r.o ? 'plain' : 'minor')) : r.t === 5 ? 'minor' : r.t <= 7 ? 'lane' : r.t === 9 ? 'foot' : 'steps';
  const VT = { moto: 16, two: 16, one: 16, minor: 12, lane: 8, foot: 4.4, steps: 4.8, plain: 12 };
  W.roadClass = roadClass;

  function buildFlat(M) {
    const T = G.T, sc = W.scene, b = W.bounds;
    // ground
    const gm = flatMat(T.ground, 600); const gg = new THREE.PlaneGeometry(14400, 14400); gg.rotateX(-Math.PI / 2); addFlat(gg, gm, -40); W.groundMat = gm;
    // areas
    const AM = { cantt: [T.grass, 14, '#b9c9a0', -36], park: [T.grass, 12, '#ffffff', -34], wood: [T.grass, 12, '#8fa878', -34], golf: [T.pitch, 16, '#d8f0c0', -33], pitch: [T.pitch, 14, '#ffffff', -32], sand: [T.sand, 8, '#ffffff', -32], cemetery: [T.grass, 12, '#a8b890', -33], paved: [T.concrete, 10, '#b8b8b8', -31], wetland: [T.grass, 12, '#6f8f70', -33] };
    const gbs = {}; for (const k in AM) gbs[k] = new GB();
    for (const c of W.cantt) polyFlat(gbs.cantt, c.r, 0.004, AM.cantt[1], WHITE);
    const wgb = new GB();
    for (const a of W.areas) { if (a.t === 'water') polyFlat(wgb, a.r, 0.03, 30, WHITE); else if (gbs[a.t]) polyFlat(gbs[a.t], a.r, 0.008, AM[a.t][1], WHITE); }
    for (const k in AM) if (gbs[k].vc) addFlat(gbs[k].build(), flatMat(AM[k][0], 1, { color: AM[k][2] }), AM[k][3]);
    for (const w of M.waterways) { const r = G.decodeRing(w[1], 0), pts = []; for (let i = 0; i < r.length; i += 2) pts.push([r[i], 0, r[i + 1]]); G.ribbon(wgb, pts, w[0] / 2, 30, 0.03, WHITE); const base = wgb.vc - pts.length * 2; for (let i = 0; i < pts.length; i++) { wgb.u[(base + i * 2) * 2] = pts[i][0] / 30; wgb.u[(base + i * 2) * 2 + 1] = pts[i][2] / 30; wgb.u[(base + i * 2 + 1) * 2] = pts[i][0] / 30 + 0.2; wgb.u[(base + i * 2 + 1) * 2 + 1] = pts[i][2] / 30; } }
    W.waterMat = new THREE.MeshStandardMaterial({ color: 0x2f4a3c, roughness: 0.07, metalness: 0.35, normalMap: T.waterNormal, normalScale: new THREE.Vector2(0.55, 0.55), depthWrite: false, envMapIntensity: 1.5 });
    W.waterNormal2 = T.waterNormal;
    addFlat(wgb.build(), W.waterMat, -30);
    // rails + runways
    const rgb = new GB(); for (const r of W.rails) { const pts = []; for (let i = 0; i < r.length; i += 2) pts.push([r[i], 0, r[i + 1]]); G.ribbon(rgb, pts, 1.7, 3.4, 0.03, WHITE); }
    if (rgb.vc) addFlat(rgb.build(), flatMat(T.track, 1), -28);
    const agb = new GB(); for (const a of M.aero) { const r = G.decodeRing(a[2], 0), pts = []; for (let i = 0; i < r.length; i += 2) pts.push([r[i], 0, r[i + 1]]); G.ribbon(agb, pts, a[1] / 2, 60, 0.02, WHITE); }
    if (agb.vc) addFlat(agb.build(), flatMat(T.road.runway, 1), -29);
    // roads (ground level) grouped by layer + 1km cell
    const LAY = ['side', 'foot', 'steps', 'lane', 'minor', 'plain', 'one', 'two', 'moto', 'disc'];
    const cells = {}; const getGB = (layer, x, z) => { const k = layer + '_' + Math.floor(x / 1000) + '_' + Math.floor(z / 1000); return cells[k] || (cells[k] = { layer, gb: new GB() }); };
    W.roadMats = {};
    for (const l of LAY) { const tex = l === 'side' ? T.sidewalk : l === 'disc' ? T.road.plain : T.road[l]; const m = flatMat(tex, 1, (l === 'side' || l === 'foot' || l === 'steps') ? {} : { roughnessMap: T.roadRough, normalMap: l === 'lane' ? null : T.roadNormal, normalScale: new THREE.Vector2(0.5, 0.5) }); m.userData.asphalt = !(l === 'side' || l === 'foot' || l === 'steps'); W.roadMats[l] = m; }
    W.roads.forEach(r => {
      if (r.elev) return;
      const pts = r.k.map(k => [W.nx[k], 0, W.nz[k]]); const cl = roadClass(r), x0 = pts[0][0], z0 = pts[0][2];
      G.ribbon(getGB(cl, x0, z0).gb, pts, r.w / 2, VT[cl], 0.02, WHITE);
      if (r.t >= 1 && r.t <= 5 && r.w >= 5.5) G.ribbon(getGB('side', x0, z0).gb, pts, r.w / 2 + (r.t === 5 ? 1.2 : 2), 2.6, 0.015, WHITE);
    });
    for (let n = 0; n < W.nn; n++) {
      if (W.deg[n] < 3 || W.nh[n] > 0.3) continue;
      const gb = getGB('disc', W.nx[n], W.nz[n]).gb, R = W.discR[n] * 1.04, base = gb.vc, x = W.nx[n], z = W.nz[n];
      gb.v(x, 0.022, z, 0, 1, 0, x / 12, z / 12, WHITE);
      for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI * 2; gb.v(x + Math.sin(a) * R, 0.022, z + Math.cos(a) * R, 0, 1, 0, (x + Math.sin(a) * R) / 12, (z + Math.cos(a) * R) / 12, WHITE); if (i) gb.i.push(base, base + i, base + i + 1); }
    }
    for (const k in cells) { const c = cells[k]; if (!c.gb.vc) continue; addFlat(c.gb.build(), W.roadMats[c.layer], -26 + LAY.indexOf(c.layer)); }
  }

  // ---------- elevated roads / flyovers / foot bridges ----------
  function edges(pts, hw) {
    const n = pts.length, L = [], R = [], D = []; let len = 0;
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[Math.min(n - 1, i + 1)];
      let d1x = b[0] - a[0], d1z = b[2] - a[2], d2x = c[0] - b[0], d2z = c[2] - b[2]; let l1 = Math.hypot(d1x, d1z), l2 = Math.hypot(d2x, d2z);
      if (l1 < 1e-6) { d1x = d2x; d1z = d2z; l1 = l2; } if (l2 < 1e-6) { d2x = d1x; d2z = d1z; l2 = l1; } if (l1 < 1e-6) { l1 = l2 = 1; d1x = d2x = 1; d1z = d2z = 0; }
      d1x /= l1; d1z /= l1; d2x /= l2; d2z /= l2; let fx = d1x + d2x, fz = d1z + d2z; const fl = Math.hypot(fx, fz); if (fl < 1e-4) { fx = d1x; fz = d1z; } else { fx /= fl; fz /= fl; }
      const rx = -fz, rz = fx, m = hw / Math.max(0.55, rx * -d1z + rz * d1x);
      if (i > 0) len += Math.hypot(b[0] - a[0], b[2] - a[2]);
      L.push([b[0] - rx * m, b[1], b[2] - rz * m]); R.push([b[0] + rx * m, b[1], b[2] + rz * m]); D.push(len);
    }
    return { L, R, D };
  }
  function buildDecks() {
    const T = G.T, cgb = new GB(); const surf = {}; const CON = G.col('#a9a69d'), CON2 = G.col('#8d8a82'), RAIL = G.col('#5c6468');
    const quad = (gb, a, b, c, d, nx, ny, nz, col) => { const i = gb.vc; gb.v(a[0], a[1], a[2], nx, ny, nz, 0, 0, col); gb.v(b[0], b[1], b[2], nx, ny, nz, 1, 0, col); gb.v(c[0], c[1], c[2], nx, ny, nz, 1, 1, col); gb.v(d[0], d[1], d[2], nx, ny, nz, 0, 1, col); gb.i.push(i, i + 1, i + 2, i, i + 2, i + 3); };
    const up = (p, dy) => [p[0], p[1] + dy, p[2]];
    W.roads.forEach(r => {
      if (!r.elev) return;
      const pts = r.k.map(k => [W.nx[k], W.nh[k], W.nz[k]]); const cl = roadClass(r); const gb = surf[cl] || (surf[cl] = new GB());
      G.ribbon(gb, pts, r.w / 2, VT[cl], 0.05, WHITE);
      const foot = r.t >= 9, e = edges(pts, r.w / 2 + (foot ? 0.05 : 0.3)), th = foot ? 0.3 : 0.9, bh = foot ? 1.1 : 0.85;
      let acc = 0;
      for (let i = 0; i + 1 < pts.length; i++) {
        const y0 = pts[i][1], y1 = pts[i + 1][1]; if (y0 < 0.25 && y1 < 0.25) continue;
        const L0 = e.L[i], L1 = e.L[i + 1], R0 = e.R[i], R1 = e.R[i + 1];
        const dx = pts[i + 1][0] - pts[i][0], dz = pts[i + 1][2] - pts[i][2], l = Math.hypot(dx, dz) || 1, rx = -dz / l, rz = dx / l;
        quad(cgb, up(R0, -th), up(L0, -th), up(L1, -th), up(R1, -th), 0, -1, 0, CON2); // underside
        const bc = foot ? RAIL : CON;
        quad(cgb, up(L1, -th), up(L0, -th), up(L0, bh), up(L1, bh), -rx, 0, -rz, bc); quad(cgb, up(R0, -th), up(R1, -th), up(R1, bh), up(R0, bh), rx, 0, rz, bc); // outer faces
        const Li0 = [L0[0] + rx * 0.25, L0[1], L0[2] + rz * 0.25], Li1 = [L1[0] + rx * 0.25, L1[1], L1[2] + rz * 0.25], Ri0 = [R0[0] - rx * 0.25, R0[1], R0[2] - rz * 0.25], Ri1 = [R1[0] - rx * 0.25, R1[1], R1[2] - rz * 0.25];
        quad(cgb, Li0, Li1, up(Li1, bh), up(Li0, bh), rx, 0, rz, bc); quad(cgb, Ri1, Ri0, up(Ri0, bh), up(Ri1, bh), -rx, 0, -rz, bc); // inner faces
        quad(cgb, up(L0, bh), up(Li0, bh), up(Li1, bh), up(L1, bh), 0, 1, 0, bc); quad(cgb, up(Ri0, bh), up(R0, bh), up(R1, bh), up(Ri1, bh), 0, 1, 0, bc);
        // pillars
        acc += l; if (acc > (foot ? 16 : 26)) { acc = 0; const mx = (pts[i][0] + pts[i + 1][0]) / 2, mz = (pts[i][2] + pts[i + 1][2]) / 2, my = (y0 + y1) / 2 - th; if (my > 1.2) { const pr = foot ? 0.22 : r.w > 7 ? 0.95 : 0.6; cgb.cyl(mx, my / 2, mz, pr, my, CON, 10); if (!foot) cgb.box(mx, my - 0.35, mz, r.w * 0.8, 0.7, 1.6, CON, Math.atan2(dx, dz)); W.addCircle(mx, mz, pr + 0.1); } }
      }
    });
    W.deckMats = {};
    for (const cl in surf) { const src = W.roadMats[cl]; const m = src.clone(); m.depthWrite = true; m.userData.asphalt = src.userData.asphalt; W.deckMats[cl] = m; const mesh = new THREE.Mesh(surf[cl].build(), m); mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; W.scene.add(mesh); }
    if (cgb.vc) { const m = new THREE.Mesh(cgb.build(), new THREE.MeshStandardMaterial({ map: T.concrete, vertexColors: true, roughness: 0.92 })); m.castShadow = m.receiveShadow = true; m.matrixAutoUpdate = false; W.scene.add(m); }
  }

  // ---------- queries ----------
  W.addCircle = function (x, z, r) { const k = key(Math.floor(x / BC), Math.floor(z / BC)); let a = W.circGrid.get(k); if (!a) W.circGrid.set(k, a = []); a.push(x, z, r); };
  W.inCantt = function (x, z) { for (const c of W.cantt) if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && G.pip(x, z, c.r)) return true; return false; };
  W.inWater = function (x, z) { const a = W.waterGrid.get(key(Math.floor(x / 100), Math.floor(z / 100))); if (!a) return false; for (const w of a) if (x > w.x0 && x < w.x1 && z > w.z0 && z < w.z1 && G.pip(x, z, w.r)) { const nr = W.nearestRoad(x, z, 14, 10); return !(nr && nr.d < W.roads[nr.ri].w / 2 + 0.5); } return false; };
  W.buildingAt = function (x, z) { const a = W.bGrid.get(key(Math.floor(x / BC), Math.floor(z / BC))); if (!a) return -1; for (const bi of a) { const b = W.buildings[bi]; if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && G.pip(x, z, b.r)) return bi; } return -1; };
  W.placeAt = function (x, z) { let best = null, bd = 700; for (const p of W.places) { const d = Math.hypot(p.x - x, p.z - z) * (p.k ? 0.8 : 1); if (d < bd) { bd = d; best = p; } } return best ? best.n : (W.inCantt(x, z) ? 'Dhaka Cantonment' : 'Dhaka'); };
  const NR = { ri: 0, i: 0, t: 0, x: 0, z: 0, d: 0, y: 0 };
  W.nearestRoad = function (x, z, rad, maxT, minT, out) {
    out = out || NR; let bd = rad, found = false; minT = minT || 0;
    const c0 = Math.floor((x - rad) / 50), c1 = Math.floor((x + rad) / 50), d0 = Math.floor((z - rad) / 50), d1 = Math.floor((z + rad) / 50);
    for (let i = c0; i <= c1; i++) for (let j = d0; j <= d1; j++) {
      const a = W.segGrid.get(key(i, j)); if (!a) continue;
      for (const v of a) {
        const ri = (v / 4096) | 0, si = v % 4096, r = W.roads[ri]; if (r.t > maxT || r.t < minT) continue;
        const A = r.k[si], Bn = r.k[si + 1], ax = W.nx[A], az = W.nz[A], dx = W.nx[Bn] - ax, dz = W.nz[Bn] - az; const l2 = dx * dx + dz * dz; let t = l2 ? ((x - ax) * dx + (z - az) * dz) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz);
        if (d < bd) { bd = d; found = true; out.ri = ri; out.i = si; out.t = t; out.x = px; out.z = pz; out.d = d; out.y = W.nh[A] + (W.nh[Bn] - W.nh[A]) * t; }
      }
    }
    return found ? out : null;
  };
  W.nearestNode = function (x, z, drive) { const o = W.nearestRoad(x, z, 150, drive ? 8 : 10, 0, {}); if (!o) return -1; const r = W.roads[o.ri]; return o.t < 0.5 ? r.k[o.i] : r.k[o.i + 1]; };
  // ground height including flyover decks; y = current height of the thing asking
  W.groundY = function (x, z, y) {
    const a = W.deckGrid.get(key(Math.floor(x / 50), Math.floor(z / 50))); if (!a) return 0; let best = 0;
    for (const d of a) { const dx = d.bx - d.ax, dz = d.bz - d.az, l2 = dx * dx + dz * dz; let t = l2 ? ((x - d.ax) * dx + (z - d.az) * dz) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; const px = d.ax + dx * t, pz = d.az + dz * t; if (Math.hypot(x - px, z - pz) > d.hw + 0.25) continue; const h = d.ah + (d.bh - d.ah) * t; if (h <= y + 1.4 && h > best) best = h; }
    return best;
  };
  // keep things on a deck from sliding through the barrier
  W.deckClamp = function (p, rad, y) {
    if (y < 1.3) return false; const a = W.deckGrid.get(key(Math.floor(p.x / 50), Math.floor(p.z / 50))); if (!a) return false; let best = 1e9, bx = 0, bz = 0;
    for (const d of a) { const dx = d.bx - d.ax, dz = d.bz - d.az, l2 = dx * dx + dz * dz; let t = l2 ? ((p.x - d.ax) * dx + (p.z - d.az) * dz) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; const h = d.ah + (d.bh - d.ah) * t; if (Math.abs(h - y) > 1.6) continue; const px = d.ax + dx * t, pz = d.az + dz * t; const over = Math.hypot(p.x - px, p.z - pz) - (d.hw - rad); if (over < best) { best = over; bx = px; bz = pz; } }
    if (best > 0 && best < 3) { const dx = bx - p.x, dz = bz - p.z, l = Math.hypot(dx, dz) || 1; p.x += dx / l * best; p.z += dz / l * best; W.hitNx = -dx / l; W.hitNz = -dz / l; return true; }
    return false;
  };
  // circle vs buildings + props; mutates p {x,z}; returns true on contact (normal in W.hitNx/Nz)
  W.collide = function (p, rad, y, skipProps) {
    if (y > 2.6) return W.deckClamp(p, rad, y);
    let hit = false;
    for (let pass = 0; pass < 2; pass++) {
      let moved = false;
      const c0 = Math.floor((p.x - rad) / BC), c1 = Math.floor((p.x + rad) / BC), d0 = Math.floor((p.z - rad) / BC), d1 = Math.floor((p.z + rad) / BC);
      for (let ci = c0; ci <= c1; ci++) for (let cj = d0; cj <= d1; cj++) {
        const k = key(ci, cj), a = W.bGrid.get(k);
        if (a) for (const bi of a) {
          const b = W.buildings[bi]; if (p.x < b.x0 - rad || p.x > b.x1 + rad || p.z < b.z0 - rad || p.z > b.z1 + rad) continue;
          const r = b.r, n = r.length; let best = 1e9, bx = 0, bz = 0;
          for (let i = 0, j = n - 2; i < n; j = i, i += 2) { const ax = r[j], az = r[j + 1], dx = r[i] - ax, dz = r[i + 1] - az, l2 = dx * dx + dz * dz; let t = l2 ? ((p.x - ax) * dx + (p.z - az) * dz) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; const px = ax + dx * t, pz = az + dz * t, d = (p.x - px) * (p.x - px) + (p.z - pz) * (p.z - pz); if (d < best) { best = d; bx = px; bz = pz; } }
          best = Math.sqrt(best); const inside = G.pip(p.x, p.z, r);
          if (inside) { let dx = bx - p.x, dz = bz - p.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; p.x = bx + dx * rad; p.z = bz + dz * rad; W.hitNx = dx; W.hitNz = dz; hit = moved = true; W.hitB = bi; }
          else if (best < rad) { let dx = p.x - bx, dz = p.z - bz; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; p.x = bx + dx * rad; p.z = bz + dz * rad; W.hitNx = dx; W.hitNz = dz; hit = moved = true; W.hitB = bi; }
        }
        if (!skipProps) { const c = W.circGrid.get(k); if (c) for (let i = 0; i < c.length; i += 3) { const dx = p.x - c[i], dz = p.z - c[i + 1], rr = rad + c[i + 2], d2 = dx * dx + dz * dz; if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2); p.x = c[i] + dx / d * rr; p.z = c[i + 1] + dz / d * rr; W.hitNx = dx / d; W.hitNz = dz / d; hit = moved = true; W.hitB = -1; } } }
      }
      if (!moved) break;
    }
    return hit;
  };
  // 3D ray vs buildings/ground. dir must be normalised. returns distance (maxD if nothing); W.rayB = building index, -2 ground, -1 none
  W.ray = function (ox, oy, oz, dx, dy, dz, maxD) {
    let best = maxD; W.rayB = -1; W.rayNx = 0; W.rayNz = 0;
    if (dy < -1e-5) { const t = -oy / dy; if (t > 0 && t < best) { best = t; W.rayB = -2; } }
    const stamp = ++W._stamp, st = W._stamps;
    let cx = Math.floor(ox / BC), cz = Math.floor(oz / BC); const sx = dx > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
    let tMX = Math.abs(dx) > 1e-9 ? (((dx > 0 ? cx + 1 : cx) * BC - ox) / dx) : Infinity, tMZ = Math.abs(dz) > 1e-9 ? (((dz > 0 ? cz + 1 : cz) * BC - oz) / dz) : Infinity;
    const tDX = Math.abs(dx) > 1e-9 ? BC / Math.abs(dx) : Infinity, tDZ = Math.abs(dz) > 1e-9 ? BC / Math.abs(dz) : Infinity; let t = 0, guard = 0;
    while (t <= best && guard++ < 400) {
      const a = W.bGrid.get(key(cx, cz));
      if (a) for (const bi of a) {
        if (st[bi] === stamp) continue; st[bi] = stamp; const b = W.buildings[bi], r = b.r, n = r.length;
        for (let i = 0, j = n - 2; i < n; j = i, i += 2) {
          const ax = r[j], az = r[j + 1], ex = r[i] - ax, ez = r[i + 1] - az, den = dx * ez - dz * ex; if (Math.abs(den) < 1e-9) continue;
          const tt = ((ax - ox) * ez - (az - oz) * ex) / den, u = ((ax - ox) * dz - (az - oz) * dx) / den;
          if (tt > 0 && tt < best && u >= 0 && u <= 1) { const y = oy + dy * tt; if (y < b.h && y > -0.2) { best = tt; W.rayB = bi; const l = Math.hypot(ex, ez) || 1; W.rayNx = ez / l; W.rayNz = -ex / l; } }
        }
        if (dy < 0 && oy > b.h) { const tt = (b.h - oy) / dy; if (tt < best && G.pip(ox + dx * tt, oz + dz * tt, r)) { best = tt; W.rayB = bi; W.rayNx = 0; W.rayNz = 0; } }
      }
      if (tMX < tMZ) { t = tMX; tMX += tDX; cx += sx; } else { t = tMZ; tMZ += tDZ; cz += sz; }
    }
    return best;
  };
  W.los = function (ax, ay, az, bx, by, bz) { const dx = bx - ax, dy = by - ay, dz = bz - az, l = Math.hypot(dx, dy, dz); if (l < 0.01) return true; return W.ray(ax, ay, az, dx / l, dy / l, dz / l, l) >= l - 0.05; };

  // ---------- A* over the drivable graph ----------
  let gS, fStamp, from, pstamp = 0;
  W.findPath = function (a, b, ped) {
    if (a < 0 || b < 0) return null; const adj = ped ? W.adjP : W.adjD;
    if (!gS) { gS = new Float32Array(W.nn); fStamp = new Int32Array(W.nn); from = new Int32Array(W.nn); }
    const st = ++pstamp, heap = new G.Heap(), nx = W.nx, nz = W.nz; gS[a] = 0; fStamp[a] = st; from[a] = -1; heap.push(0, a); let it = 0;
    while (heap.size && it++ < 90000) {
      const n = heap.pop(); if (n === b) break; const e = adj[n]; if (!e) continue; const g = gS[n];
      for (let i = 0; i < e.length; i += 3) { const to = e[i], c = g + e[i + 1] / (ped ? 1.4 : W.SPEED[W.roads[e[i + 2]].t]); if (fStamp[to] !== st || c < gS[to]) { gS[to] = c; fStamp[to] = st; from[to] = n; heap.push(c + Math.hypot(nx[to] - nx[b], nz[to] - nz[b]) / (ped ? 1.4 : 22), to); } }
    }
    if (fStamp[b] !== st) return null; const out = []; for (let n = b; n !== -1; n = from[n]) out.push(n); out.reverse(); return out;
  };

  // ---------- chunk streaming ----------
  function buildChunk(ci, cj) {
    const list = W.chunkB.get(key(ci, cj)) || []; const grp = new THREE.Group(); grp.matrixAutoUpdate = false;
    const gbs = []; for (let s = 0; s < 9; s++) gbs.push(null); const roof = new GB(); const get = s => gbs[s] || (gbs[s] = new GB());
    for (const bi of list) {
      const b = W.buildings[bi], r = b.r, n = r.length / 2, h = b.h, hs = G.hash(bi * 7 + 3), pal = TINT[b.s], tint = G.col(pal[hs % pal.length]);
      const dark = [tint[0] * 0.7, tint[1] * 0.7, tint[2] * 0.7], uo = hs % 4, vo = (hs >> 4) % 4, shop = b.shop && b.s !== 2 && b.s !== 6;
      const gb = get(b.s), sgb = shop ? get(8) : null;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, ax = r[i * 2], az = r[i * 2 + 1], bx = r[j * 2], bz = r[j * 2 + 1], len = Math.hypot(bx - ax, bz - az); if (len < 0.08) continue;
        const nx = (bz - az) / len, nz = -(bx - ax) / len, bays = Math.max(1, Math.round(len / 3.2)), ua = (uo + bays) / 4, ub = uo / 4;
        let y0 = 0, v0 = vo / 4, c0 = dark;
        if (shop) { const k = sgb.vc; sgb.v(ax, 0, az, nx, 0, nz, ua, 0, G.col('#b8b8b8')); sgb.v(bx, 0, bz, nx, 0, nz, ub, 0, G.col('#b8b8b8')); sgb.v(bx, FH, bz, nx, 0, nz, ub, 0.25, WHITE); sgb.v(ax, FH, az, nx, 0, nz, ua, 0.25, WHITE); sgb.i.push(k, k + 2, k + 1, k, k + 3, k + 2); if (b.f < 2) continue; y0 = FH; v0 = (vo + 1) / 4; c0 = tint; }
        const k = gb.vc, v1 = v0 + (b.s === 2 ? 0.25 : (h - y0) / FH / 4);
        gb.v(ax, y0, az, nx, 0, nz, ua, v0, c0); gb.v(bx, y0, bz, nx, 0, nz, ub, v0, c0); gb.v(bx, h, bz, nx, 0, nz, ub, v1, tint); gb.v(ax, h, az, nx, 0, nz, ua, v1, tint); gb.i.push(k, k + 2, k + 1, k, k + 3, k + 2);
      }
      // roof
      const rc = b.s === 2 ? G.col(['#8f989b', '#7b6a5c', '#6f7f8c', '#9a8f80'][hs % 4]) : b.s === 6 ? G.col('#dfe8dc') : G.col(ROOFC[hs % ROOFC.length]);
      const f = triangulate(r), base = roof.vc;
      for (let i = 0; i < n; i++) roof.v(r[i * 2], h, r[i * 2 + 1], 0, 1, 0, r[i * 2] / 9, r[i * 2 + 1] / 9, rc);
      for (const t of f) { const a = t[0], bb = t[1], c = t[2]; const ny = (r[bb * 2 + 1] - r[a * 2 + 1]) * (r[c * 2] - r[a * 2]) - (r[bb * 2] - r[a * 2]) * (r[c * 2 + 1] - r[a * 2 + 1]); if (ny >= 0) roof.i.push(base + a, base + bb, base + c); else roof.i.push(base + a, base + c, base + bb); }
      const area = (b.x1 - b.x0) * (b.z1 - b.z0);
      if (b.s === 6 && area > 110 && G.pip(b.cx, b.cz, r)) { // mosque dome + minaret
        const R = Math.min(5.5, Math.sqrt(area) / 3.6); roof.sph(b.cx, h, b.cz, R, R * 0.95, R, G.col(hs % 2 ? '#e9efe6' : '#2f8f6a'), 12); roof.cyl(b.cx, h + R * 0.95 + 0.6, b.cz, 0.08, 1.4, G.col('#d9b84a'), 6);
        const mx = r[0] + (b.cx - r[0]) * 0.12, mz = r[1] + (b.cz - r[1]) * 0.12, mh = h + 9; roof.cyl(mx, mh / 2, mz, 0.75, mh, G.col('#eef1ea'), 10); roof.cyl(mx, mh + 0.2, mz, 1.1, 0.4, G.col('#2f8f6a'), 10); roof.cyl(mx, mh + 1.5, mz, 0.8, 2.4, G.col('#2f8f6a'), 10, 0, 0, 0, 0.05);
      } else if (b.f >= 3 && area > 60 && b.s !== 2 && b.s !== 5 && G.pip(b.cx, b.cz, r)) {
        if (hs % 3 !== 0) { roof.box(b.cx, h + 1.3, b.cz, 3, 2.6, 3.4, dark, (hs % 7) * 0.4); if (hs % 2) roof.cyl(b.cx + 0.3, h + 3.3, b.cz, 0.75, 1.4, G.col(hs % 4 < 2 ? '#15171a' : '#1f4f8f'), 8); }
        else if (hs % 2) { roof.cyl(b.cx, h + 1.2, b.cz, 0.8, 1.4, G.col('#15171a'), 8); roof.box(b.cx, h + 0.25, b.cz, 1.4, 0.5, 1.4, G.col('#77746c')); }
      }
    }
    const disp = [];
    for (let s = 0; s < 9; s++) if (gbs[s] && gbs[s].vc) { const m = new THREE.Mesh(gbs[s].build(), W.mats[s]); m.castShadow = m.receiveShadow = true; m.matrixAutoUpdate = false; grp.add(m); disp.push(m.geometry); }
    if (roof.vc) { const m = new THREE.Mesh(roof.build(), W.roofMat); m.castShadow = m.receiveShadow = true; m.matrixAutoUpdate = false; grp.add(m); disp.push(m.geometry); }
    const ch = { ci, cj, group: grp, disp, props: null, x: (ci + 0.5) * CS, z: (cj + 0.5) * CS };
    for (const h of W.chunkHooks) h(ch);
    W.scene.add(grp); return ch;
  }
  let tick = 0;
  W.update = function (px, pz, budget) {
    const R = W.viewDist, ci = Math.floor(px / CS), cj = Math.floor(pz / CS), n = Math.ceil(R / CS);
    if (tick++ % 20 === 0 || W.queue.length === 0) {
      W.queue.length = 0;
      for (let i = ci - n; i <= ci + n; i++) for (let j = cj - n; j <= cj + n; j++) { const cxm = (i + 0.5) * CS, czm = (j + 0.5) * CS, d = Math.hypot(cxm - px, czm - pz); if (d > R + CS * 0.5) continue; if (cxm < W.bounds.minX - CS || cxm > W.bounds.maxX + CS || czm < W.bounds.minZ - CS || czm > W.bounds.maxZ + CS) continue; const k = key(i, j); if (!W.chunks.has(k)) W.queue.push([d, i, j]); }
      W.queue.sort((a, b) => b[0] - a[0]);
      for (const [k, ch] of W.chunks) { const d = Math.hypot(ch.x - px, ch.z - pz); if (d > R + CS * 1.6) { W.scene.remove(ch.group); for (const g of ch.disp) g.dispose(); if (ch.onDispose) ch.onDispose(); W.chunks.delete(k); } else if (ch.props) ch.props.visible = d < W.propDist; }
    }
    let built = 0; const t0 = performance.now();
    while (W.queue.length && built < (budget || 1) && (built === 0 || performance.now() - t0 < 10)) { const q = W.queue.pop(); const k = key(q[1], q[2]); if (!W.chunks.has(k)) { W.chunks.set(k, buildChunk(q[1], q[2])); built++; } }
    return W.queue.length;
  };
  W.propDist = 480;
  W.setNight = function (n) { for (let s = 0; s < 9; s++) W.mats[s].emissiveIntensity = n * (s === 1 ? 0.6 : s === 8 ? 1.2 : 0.8); };
  W.setWet = function (w) { // wet asphalt: darker, glossier
    for (const k in W.roadMats) { const m = W.roadMats[k]; if (!m.userData.asphalt) { m.roughness = 0.95 - w * 0.35; continue; } m.roughness = 0.95 - w * 0.62; m.color.setScalar(1 - w * 0.35); m.envMapIntensity = 1 + w * 1.2; }
    for (const k in W.deckMats) { const m = W.deckMats[k]; m.roughness = 0.95 - w * 0.6; m.color.setScalar(1 - w * 0.35); }
    W.groundMat.roughness = 0.95 - w * 0.3; W.groundMat.color.setScalar(1 - w * 0.25); W.roofMat.roughness = 0.95 - w * 0.4;
  };
})();
