'use strict';
// Street furniture: trees, lamps, electric poles + wires, doors, name signs, bus shelters, tea stalls, gates, signals.
(function () {
  const G = window.G, GB = G.GB, W = G.world;
  const P = G.props = {};
  const key = (i, j) => (i + 512) * 1024 + (j + 512), CS = W.CS, ck = (x, z) => key(Math.floor(x / CS), Math.floor(z / CS));
  P.CAT = {
    food: { col: '#c0392b', label: 'RESTAURANT', icon: '🍛', blip: 2 }, tea: { col: '#a04000', label: 'TEA STALL', icon: '☕', blip: 3 }, store: { col: '#1f6fb8', label: 'STORE', icon: '🛒', blip: 3 },
    clothes: { col: '#8e44ad', label: 'CLOTHING', icon: '👕', blip: 1 }, barber: { col: '#16a085', label: 'SALON', icon: '✂', blip: 1 }, pharmacy: { col: '#27ae60', label: 'PHARMACY', icon: '💊', blip: 2 },
    hospital: { col: '#e74c3c', label: 'HOSPITAL', icon: '✚', blip: 1 }, bank: { col: '#2c3e50', label: 'BANK', icon: '🏦', blip: 2 }, atm: { col: '#34495e', label: 'ATM', icon: '৳', blip: 3 },
    mosque: { col: '#1d8f5f', label: 'MOSQUE', icon: '🕌', blip: 2 }, temple: { col: '#d35400', label: 'TEMPLE', icon: '🛕', blip: 2 }, school: { col: '#d68910', label: 'SCHOOL', icon: '🎓', blip: 3 },
    police: { col: '#1b2a6b', label: 'POLICE', icon: '★', blip: 1 }, fuel: { col: '#e67e22', label: 'FILLING STATION', icon: '⛽', blip: 1 }, garage: { col: '#e67e22', label: 'GARAGE', icon: '🔧', blip: 1 },
    hotel: { col: '#7d3c98', label: 'HOTEL', icon: '🛏', blip: 2 }, office: { col: '#566573', label: 'OFFICE', icon: '▣', blip: 3 }, public: { col: '#5d6d7e', label: 'PUBLIC HALL', icon: '🏛', blip: 2 },
    jewelry: { col: '#b7950b', label: 'JEWELLERS', icon: '💎', blip: 3 }, gunshop: { col: '#7b241c', label: 'ARMS STORE', icon: '🔫', blip: 0 }, cardealer: { col: '#117864', label: 'CAR SHOWROOM', icon: '🚗', blip: 0 },
    home: { col: '#2ecc71', label: 'SAFEHOUSE', icon: '🏠', blip: 0 }, property: { col: '#f1c40f', label: 'PROPERTY', icon: '🏠', blip: 0 }, house: { col: '#7f8c8d', label: 'RESIDENCE', icon: '', blip: 9 },
    vip: { col: '#c9a227', label: 'BOYS CLUB RESIDENCE', icon: '👑', blip: 0 }, armory: { col: '#3b4046', label: 'PRIVATE ARMORY', icon: '', blip: 9 }, bus: { col: '#1565c0', label: 'BUS STOP', icon: '🚌', blip: 1 }, gate: { col: '#1e5631', label: 'DHAKA CANTONMENT', icon: '', blip: 9 }
  };
  const T_ = { trees: new Map(), lamps: new Map(), poles: new Map(), wires: new Map(), doors: new Map(), kiosks: new Map(), stops: new Map(), gates: new Map(), signals: new Map(), air: new Map() };
  const push = (m, k, v) => { let a = m.get(k); if (!a) m.set(k, a = []); a.push(v); };

  // ---------- tree species ----------
  function blob(gb, x, y, z, sx, sy, sz, hex, r) {
    const b = gb.vc; gb.sph(x, y, z, sx, sy, sz, G.col(hex), 8, r() * 6);
    for (let i = b; i < gb.vc; i++) { const h = G.h01(Math.round(gb.p[i * 3] * 31) * 7919 + Math.round(gb.p[i * 3 + 1] * 31) * 104729 + Math.round(gb.p[i * 3 + 2] * 31) * 1299709); const j = (h - 0.5) * 0.45; gb.p[i * 3] += gb.n[i * 3] * j * sx * 0.5; gb.p[i * 3 + 1] += gb.n[i * 3 + 1] * j * sy * 0.5; gb.p[i * 3 + 2] += gb.n[i * 3 + 2] * j * sz * 0.5; const s = (0.7 + h * 0.55) * (0.62 + 0.38 * (gb.n[i * 3 + 1] * 0.5 + 0.5)); gb.c[i * 3] *= s; gb.c[i * 3 + 1] *= s; gb.c[i * 3 + 2] *= s; gb.u[i * 2] *= 3; gb.u[i * 2 + 1] *= 3; }
  }
  function treeGeo(kind) {
    const gb = new GB(), r = G.rng(500 + kind * 13), TR = G.col('#4d3b2a'), TR2 = G.col('#6b5a48');
    const GR = ['#3f6b2a', '#4a7a30', '#356024', '#557f35', '#2f5a26'];
    if (kind === 0) { // rain tree: broad canopy
      gb.cyl(0, 2.3, 0, 0.36, 4.6, TR, 8, 0, 0, 0, 0.26); gb.cyl(0.7, 5.2, 0.2, 0.16, 2.6, TR, 6, 0, 0, -0.6); gb.cyl(-0.6, 5.2, -0.4, 0.16, 2.6, TR, 6, 0.5, 0, 0.55); gb.cyl(0.1, 5.3, 0.8, 0.14, 2.4, TR, 6, 0.6, 0, 0);
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28, d = i === 0 ? 0 : 2.3 + r() * 0.7; blob(gb, Math.cos(a) * d, 6.6 + r() * 1.1 + (i === 0 ? 1 : 0), Math.sin(a) * d, 2.5 + r() * 0.6, 1.5 + r() * 0.4, 2.5 + r() * 0.6, GR[i % 5], r); }
    } else if (kind === 1) { // mahogany: tall
      gb.cyl(0, 3.6, 0, 0.3, 7.2, TR2, 8, 0, 0, 0, 0.2);
      blob(gb, 0, 8.2, 0, 2.3, 2.0, 2.3, GR[0], r); blob(gb, 0.8, 10, 0.3, 1.9, 1.8, 1.9, GR[1], r); blob(gb, -0.7, 9.4, -0.6, 1.8, 1.6, 1.8, GR[2], r); blob(gb, 0, 11.6, 0, 1.4, 1.5, 1.4, GR[3], r);
    } else if (kind === 2) { // krishnachura: flat wide canopy with red blossom
      gb.cyl(0, 1.8, 0, 0.3, 3.6, TR, 8, 0, 0, 0.12, 0.22); gb.cyl(1.0, 4.2, 0, 0.14, 2.6, TR, 6, 0, 0, -0.9); gb.cyl(-1.0, 4.2, 0.2, 0.14, 2.6, TR, 6, 0, 0, 0.9); gb.cyl(0, 4.2, 1.0, 0.14, 2.4, TR, 6, 0.9, 0, 0);
      const C = ['#4a7a30', '#b8452a', '#3f6b2a', '#557f35', '#c2532c', '#456f30'];
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28, d = i < 2 ? 0.8 : 2.8 + r() * 0.8; blob(gb, Math.cos(a) * d, 5.3 + r() * 0.6, Math.sin(a) * d, 2.4 + r() * 0.5, 0.85 + r() * 0.3, 2.4 + r() * 0.5, C[i % 6], r); }
    } else if (kind === 3) { // coconut palm
      let x = 0, y = 0; for (let i = 0; i < 6; i++) { gb.cyl(x + 0.08, y + 0.75, 0, 0.17 - i * 0.012, 1.55, TR2, 7, 0, 0, -0.1); x += 0.15; y += 1.5; }
      for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28 + r(); let px = x, py = y + 0.1, pz = 0; const tl = [-0.35, 0.3, 0.95]; for (let s = 0; s < 3; s++) { const t = tl[s] + r() * 0.15, L = 1.25, dx = Math.sin(a) * Math.cos(t), dy = -Math.sin(t), dz = Math.cos(a) * Math.cos(t); const b = gb.vc; gb.box(px + dx * L / 2, py + dy * L / 2, pz + dz * L / 2, 0.62 - s * 0.15, 0.035, L, G.col(GR[(i + s) % 5]), a, t); for (let k = b; k < gb.vc; k++) { gb.u[k * 2] *= 2; } px += dx * L; py += dy * L; pz += dz * L; } }
      for (let i = 0; i < 4; i++) gb.sph(x + Math.cos(i * 1.6) * 0.25, y - 0.2, Math.sin(i * 1.6) * 0.25, 0.14, 0.16, 0.14, G.col('#6b7a2a'), 1);
    } else if (kind === 4) { // debdaru: tall column
      gb.cyl(0, 1.2, 0, 0.14, 2.4, TR2, 6);
      const b = gb.vc; gb.cyl(0, 5.6, 0, 1.15, 8.2, G.col('#2f5a26'), 9, 0, 0, 0, 0.12); gb.cyl(0, 2.6, 0, 1.25, 2.2, G.col('#356024'), 9, 0, 0, 0, 1.0);
      for (let i = b; i < gb.vc; i++) { const h = G.h01(i * 131 + 7); const s = 0.7 + h * 0.5; gb.c[i * 3] *= s; gb.c[i * 3 + 1] *= s; gb.c[i * 3 + 2] *= s; gb.u[i * 2] *= 4; gb.u[i * 2 + 1] *= 6; }
    } else { blob(gb, 0, 0.7, 0, 1.1, 0.8, 1.1, GR[1], r); blob(gb, 0.6, 0.5, 0.3, 0.7, 0.55, 0.7, GR[3], r); }
    return gb.build();
  }

  P.init = function (scene) {
    const T = G.T, M = window.MAPDATA;
    P.windU = { value: new THREE.Vector2(0, 1) };
    P.treeMat = new THREE.MeshStandardMaterial({ map: T.leaf, vertexColors: true, roughness: 0.92 });
    P.treeMat.onBeforeCompile = sh => { sh.uniforms.uWind = P.windU; sh.vertexShader = 'uniform vec2 uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat ph = instanceMatrix[3].x*0.37 + instanceMatrix[3].z*0.23;\n#else\nfloat ph = 0.0;\n#endif\nfloat sw = max(0.0, position.y-1.6);\ntransformed.x += sin(uWind.x*1.7 + ph + position.y*0.35)*0.018*uWind.y*sw;\ntransformed.z += cos(uWind.x*1.3 + ph)*0.014*uWind.y*sw;'); };
    P.treeGeos = []; for (let k = 0; k < 6; k++) P.treeGeos.push(treeGeo(k));
    P.propMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.05 });
    P.lampMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffd9a0, emissiveIntensity: 0 });
    P.poolMat = new THREE.MeshBasicMaterial({ map: T.pool, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, color: 0xffd6a0, fog: false });
    P.wireMat = new THREE.LineBasicMaterial({ color: 0x111111 });
    P.sigMats = []; for (const c of [0xff2a1a, 0xffb300, 0x1aff5a, 0xff2a1a, 0xffb300, 0x1aff5a]) P.sigMats.push(new THREE.MeshStandardMaterial({ color: 0x111111, emissive: c, emissiveIntensity: 0.05 }));
    const r = G.rng(777);
    const free = (x, z, clear) => { if (W.buildingAt(x, z) >= 0) return false; const nr = W.nearestRoad(x, z, 20, 10); if (nr && nr.d < W.roads[nr.ri].w / 2 + clear) return false; return true; };
    const EST = G.estate; const nearDoor = (x, z) => { for (let i = Math.floor((x - 6) / 50); i <= Math.floor((x + 6) / 50); i++) for (let j = Math.floor((z - 6) / 50); j <= Math.floor((z + 6) / 50); j++) { const a = W.poiGrid.get(key(i, j)); if (a) for (const p of a) { if (p.kiosk) continue; const ox = Math.sin(p.a), oz = Math.cos(p.a), dx = x - p.x, dz = z - p.z, f = dx * ox + dz * oz, sd = Math.abs(dx * oz - dz * ox); if (f > -0.5 && f < 7 && sd < 2.6) return true; } } return false; };
    const addTree = (x, z, kind, s, force) => { if (x < W.bounds.minX || x > W.bounds.maxX || z < W.bounds.minZ || z > W.bounds.maxZ) return; if (!force && (nearDoor(x, z) || (EST && EST.keepClear(x, z)))) return; push(T_.trees, ck(x, z), [x, z, kind, s, r() * 6.28]); W.addCircle(x, z, kind === 5 ? 0.3 : 0.32 * s); };
    // 1. woods, parks
    const DENS = { wood: 75, park: 240, golf: 650, cemetery: 260, wetland: 500 };
    for (const a of W.areas) { const d = DENS[a.t]; if (!d) continue; const n = Math.min(900, Math.floor((a.x1 - a.x0) * (a.z1 - a.z0) / d)); for (let i = 0; i < n; i++) { const x = a.x0 + r() * (a.x1 - a.x0), z = a.z0 + r() * (a.z1 - a.z0); if (!G.pip(x, z, a.r) || !free(x, z, 1.5)) continue; addTree(x, z, a.t === 'wood' ? [0, 1, 1, 2, 0, 3][(r() * 6) | 0] : [0, 2, 1, 3, 5, 5][(r() * 6) | 0], 0.75 + r() * 0.6); } }
    // 2. mapped tree rows
    for (const tr of M.treeRows) { const p = G.decodeRing(tr, 0); let acc = 0; for (let i = 0; i + 2 < p.length; i += 2) { const dx = p[i + 2] - p[i], dz = p[i + 3] - p[i + 1], l = Math.hypot(dx, dz); while (acc < l) { const x = p[i] + dx * acc / l, z = p[i + 1] + dz * acc / l; if (free(x, z, 0.6)) addTree(x, z, 4, 0.8 + r() * 0.4); acc += 7; } acc -= l; } }
    // 3. road sides: trees, lamps, electric poles
    W.roads.forEach((rd, ri) => {
      if (rd.elev || rd.t === 0 || rd.t > 6) return;
      const k = rd.k, hw = rd.w / 2; let accT = 5 + r() * 10, accL = 8, accP = 4, cnt = 0, lcnt = 0, lastPole = null; const hs = G.hash(ri);
      for (let i = 0; i + 1 < k.length; i++) {
        const ax = W.nx[k[i]], az = W.nz[k[i]], dx = W.nx[k[i + 1]] - ax, dz = W.nz[k[i + 1]] - az, l = Math.hypot(dx, dz); if (l < 0.5) continue; const fx = dx / l, fz = dz / l, rx = -fz, rz = fx;
        const cantt = W.inCantt(ax, az), spT = cantt ? 13 : rd.t <= 4 ? 30 : 46;
        if (rd.t <= 5) { while (accT < l) { const side = cnt++ % 2 ? 1 : -1, off = hw + (rd.t <= 4 ? 2.6 : 1.5), x = ax + fx * accT + rx * side * off, z = az + fz * accT + rz * side * off; if (free(x, z, 0.9) && !W.inWater(x, z)) addTree(x, z, cantt ? [4, 4, 0, 2, 1, 4][(hs + cnt) % 6] : [0, 1, 2, 3, 1][(hs + (cnt >> 2)) % 5], 0.8 + r() * 0.45); accT += spT * (0.8 + r() * 0.4); } accT -= l; }
        if (rd.t <= 4 && rd.w >= 6) { while (accL < l) { const side = lcnt++ % 2 ? 1 : -1, x = ax + fx * accL + rx * side * (hw + 0.9), z = az + fz * accL + rz * side * (hw + 0.9); if (W.buildingAt(x, z) < 0 && !(EST && EST.keepClear(x, z))) { push(T_.lamps, ck(x, z), [x, z, Math.atan2(-rx * side, -rz * side)]); W.addCircle(x, z, 0.14); } accL += 38; } accL -= l; }
        else if (rd.t >= 5 && !cantt) { const side = hs % 2 ? 1 : -1; while (accP < l) { const x = ax + fx * accP + rx * side * (hw + 0.25), z = az + fz * accP + rz * side * (hw + 0.25); if (W.buildingAt(x, z) < 0) { const pole = [x, z, Math.atan2(fx, fz), hs + lcnt++]; push(T_.poles, ck(x, z), pole); W.addCircle(x, z, 0.13); if (lastPole && Math.hypot(lastPole[0] - x, lastPole[1] - z) < 60) push(T_.wires, ck(x, z), [lastPole[0], lastPole[1], x, z, hs + lcnt]); lastPole = pole; } else lastPole = null; accP += 31; } accP -= l; }
      }
    });
    // 4. scattered greenery inside the cantonment
    for (const c of W.cantt) { const n = Math.floor((c.x1 - c.x0) * (c.z1 - c.z0) / 1900); for (let i = 0; i < n; i++) { const x = c.x0 + r() * (c.x1 - c.x0), z = c.z0 + r() * (c.z1 - c.z0); if (!G.pip(x, z, c.r) || !free(x, z, 2.5) || W.inWater(x, z)) continue; addTree(x, z, [0, 1, 2, 4, 3, 0, 5][(r() * 7) | 0], 0.8 + r() * 0.5); } }
    if (EST) for (const t of EST.treeSpots) addTree(t[0], t[1], t[2], t[2] === 5 ? 1 : 0.85 + r() * 0.3, true);
    // doors etc
    for (const p of W.pois) { if (p.kiosk) { push(T_.kiosks, ck(p.x, p.z), p); W.addCircle(p.x - Math.sin(p.a) * 0.9, p.z - Math.cos(p.a) * 0.9, 1.1); } else push(T_.doors, ck(p.x, p.z), p); }
    for (const s of W.stops) { const nr = W.nearestRoad(s.rx, s.rz, 30, 6, 0, {}); let dx = s.x - s.rx, dz = s.z - s.rz, l = Math.hypot(dx, dz); const hw = nr ? W.roads[nr.ri].w / 2 : 4; if (l < 0.5 && nr) { const rd = W.roads[nr.ri], a = rd.k[nr.i], b = rd.k[nr.i + 1]; dx = -(W.nz[b] - W.nz[a]); dz = W.nx[b] - W.nx[a]; l = Math.hypot(dx, dz) || 1; }
      dx /= l; dz /= l; s.sx = s.rx + dx * (hw + 1.7); s.sz = s.rz + dz * (hw + 1.7); s.a = Math.atan2(-dx, -dz); s.c = 'bus'; s.bx = s.rx + dx * (hw - 1.6); s.bz = s.rz + dz * (hw - 1.6);
      if (W.buildingAt(s.sx, s.sz) >= 0) { s.sx = s.rx + dx * (hw + 0.6); s.sz = s.rz + dz * (hw + 0.6); }
      push(T_.stops, ck(s.sx, s.sz), s); W.addCircle(s.sx - Math.cos(s.a) * 1.6, s.sz + Math.sin(s.a) * 1.6, 0.12); W.addCircle(s.sx + Math.cos(s.a) * 1.6, s.sz - Math.sin(s.a) * 1.6, 0.12); }
    for (const g of W.checkpoints) { g.c = 'gate'; push(T_.gates, ck(g.x, g.z), g); const rx = Math.cos(g.a), rz = -Math.sin(g.a), o = g.w / 2 + 1.2; W.addCircle(g.x + rx * o, g.z + rz * o, 0.7); W.addCircle(g.x - rx * o, g.z - rz * o, 0.7); }
    W.signalNodes = new Map(); W.signals.forEach((s, i) => { push(T_.signals, ck(s.x, s.z), s); const nr = W.nearestRoad(s.x, s.z, 15, 8, 0, {}); if (nr) { const rd = W.roads[nr.ri]; W.signalNodes.set(nr.t < 0.5 ? rd.k[nr.i] : rd.k[nr.i + 1], i); } });
    for (const a of M.aircraft) push(T_.air, ck(a[0] / 10, a[1] / 10), [a[0] / 10, a[1] / 10, a[2] / 100]);
    W.chunkHooks.push(buildProps);
    // pooled name signs + door markers
    P.signs = []; const sg = new THREE.PlaneGeometry(3.1, 0.78);
    for (let i = 0; i < 30; i++) { const [c, x] = G.cv(512, 128); const t = G.mkTex(c, { clamp: true }); const m = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.6 })); m.visible = false; scene.add(m); P.signs.push({ mesh: m, c, x, t, poi: null }); }
    P.rings = []; const rg = new THREE.RingGeometry(0.55, 0.75, 28); rg.rotateX(-Math.PI / 2);
    for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })); m.visible = false; m.renderOrder = 5; scene.add(m); P.rings.push(m); }
    P.timer = 0; P.near = [];
  };

  function door(gb, p) {
    const cat = P.CAT[p.c] || P.CAT.store, a = p.a, sx = Math.sin(a), sz = Math.cos(a), x = p.x, z = p.z, res = p.c === 'house' || p.c === 'home' || p.c === 'property' || p.c === 'vip';
    const hs = G.hash(p.id * 13 + 1), frame = G.col(res ? '#3d2b1c' : '#2b2b2b'), dc = res ? G.col(['#5a3a22', '#6b4426', '#2f4a3a', '#3a3f5a', '#7a2f25'][hs % 5]) : G.col('#24323c');
    gb.box(x + sx * 0.05, 1.22, z + sz * 0.05, 1.5, 2.44, 0.16, frame, a); gb.box(x + sx * 0.13, 1.1, z + sz * 0.13, 1.14, 2.14, 0.07, dc, a);
    gb.box(x + sx * 0.19 + sz * 0.4, 1.05, z + sz * 0.19 - sx * 0.4, 0.05, 0.22, 0.05, G.col('#c8b070'), a);
    gb.box(x + sx * 0.55, 0.07, z + sz * 0.55, 2.0, 0.14, 1.1, G.col('#8f8c84'), a);
    if (!res) { gb.box(x + sx * 0.8, 2.66, z + sz * 0.8, 3.3, 0.07, 1.5, G.col(cat.col), a, 0.2); gb.box(x + sx * 0.1, 3.2, z + sz * 0.1, 3.3, 0.95, 0.12, G.col('#1c1c1c'), a); }
    else if (p.c !== 'house') { gb.box(x + sx * 0.5, 2.62, z + sz * 0.5, 2.4, 0.1, 1.0, G.col('#d8d2c2'), a); gb.box(x + sx * 0.9 + sz * 1.1, 1.3, z + sz * 0.9 - sx * 1.1, 0.16, 2.6, 0.16, G.col('#d8d2c2'), a); gb.box(x + sx * 0.9 - sz * 1.1, 1.3, z + sz * 0.9 + sx * 1.1, 0.16, 2.6, 0.16, G.col('#d8d2c2'), a); }
  }
  function kiosk(gb, p) {
    const a = p.a, sx = Math.sin(a), sz = Math.cos(a), bx = p.x - sx * 0.9, bz = p.z - sz * 0.9, WD = G.col('#6a4a2e'), TIN = G.col('#7f8a8e');
    for (const [ox, oz] of [[-1, -0.8], [1, -0.8], [-1, 0.8], [1, 0.8]]) gb.box(bx + sz * ox + sx * oz, 1.1, bz - sx * ox + sz * oz, 0.08, 2.2, 0.08, WD, a);
    gb.box(bx + sx * 0.2, 2.25, bz + sz * 0.2, 2.6, 0.06, 2.4, TIN, a, 0.12); gb.box(bx + sx * 0.75, 0.5, bz + sz * 0.75, 2.1, 1.0, 0.35, WD, a); gb.box(bx - sx * 0.75, 1.1, bz - sz * 0.75, 2.1, 2.2, 0.06, G.col('#5d6f7a'), a);
    for (let i = 0; i < 6; i++) { const o = -0.8 + i * 0.32; gb.cyl(bx + sx * 0.75 + sz * o, 1.14, bz + sz * 0.75 - sx * o, 0.09, 0.26, G.col(['#e8c36a', '#c0392b', '#f5e6c8', '#d98a3a', '#8fbf6a', '#f0f0f0'][i]), 7); }
    gb.cyl(bx + sx * 0.75 + sz * 0.95, 1.1, bz + sz * 0.75 - sx * 0.95, 0.12, 0.2, G.col('#b0b4b8'), 8);
    gb.box(p.x + sx * 0.9, 0.42, p.z + sz * 0.9, 1.8, 0.06, 0.3, WD, a); gb.box(p.x + sx * 0.9 + sz * 0.8, 0.2, p.z + sz * 0.9 - sx * 0.8, 0.06, 0.4, 0.28, WD, a); gb.box(p.x + sx * 0.9 - sz * 0.8, 0.2, p.z + sz * 0.9 + sx * 0.8, 0.06, 0.4, 0.28, WD, a);
    for (let i = 0; i < 4; i++) gb.box(bx - sx * 0.68 + sz * (-0.7 + i * 0.45), 1.75, bz - sz * 0.68 - sx * (-0.7 + i * 0.45), 0.3, 0.36, 0.05, G.col(['#c0392b', '#f1c40f', '#2e86c1', '#27ae60'][i]), a);
  }
  function shelter(gb, s) {
    const a = s.a, sx = Math.sin(a), sz = Math.cos(a), cx = Math.cos(a), cz = -Math.sin(a), x = s.sx, z = s.sz, ST = G.col('#3f5a73'), RF = G.col('#c9d2d8');
    gb.box(x + cx * 1.6, 1.25, z + cz * 1.6, 0.1, 2.5, 0.1, ST, a); gb.box(x - cx * 1.6, 1.25, z - cz * 1.6, 0.1, 2.5, 0.1, ST, a);
    gb.box(x + sx * 0.35, 2.55, z + sz * 0.35, 3.8, 0.08, 1.7, RF, a, -0.08); gb.box(x - sx * 0.3, 1.5, z - sz * 0.3, 3.2, 1.5, 0.05, G.col('#8fa7b8'), a);
    gb.box(x, 0.45, z, 2.6, 0.07, 0.4, G.col('#7a5a3a'), a); gb.box(x + cx * 1.1, 0.22, z + cz * 1.1, 0.07, 0.44, 0.35, ST, a); gb.box(x - cx * 1.1, 0.22, z - cz * 1.1, 0.07, 0.44, 0.35, ST, a);
    gb.cyl(x + cx * 2.3 + sx * 0.5, 1.5, z + cz * 2.3 + sz * 0.5, 0.045, 3, G.col('#d0d0d0'), 6); gb.box(x + cx * 2.3 + sx * 0.5, 2.8, z + cz * 2.3 + sz * 0.5, 0.6, 0.6, 0.05, G.col('#1565c0'), a);
  }
  function gate(gb, g) {
    const a = g.a, fx = Math.sin(a), fz = Math.cos(a), rx = Math.cos(a), rz = -Math.sin(a), o = g.w / 2 + 1.2, CR = G.col('#e8e2cf'), RD = G.col('#8f2f25'), GN = G.col('#1e5631');
    for (const s of [-1, 1]) {
      const x = g.x + rx * o * s, z = g.z + rz * o * s;
      if (g.g) { gb.box(x, 3.6, z, 1.3, 7.2, 1.3, CR, a); gb.box(x, 0.5, z, 1.5, 1.0, 1.5, RD, a); gb.box(x, 7.4, z, 1.6, 0.4, 1.6, RD, a); }
      gb.box(x + rx * s * 2.0, 1.3, z + rz * s * 2.0, 1.8, 2.6, 1.8, G.col('#d9d3bf'), a); gb.box(x + rx * s * 2.0, 2.7, z + rz * s * 2.0, 2.3, 0.14, 2.3, GN, a); gb.box(x + rx * s * 2.0 - fx * 0.92, 1.6, z + rz * s * 2.0 - fz * 0.92, 1.0, 0.8, 0.04, G.col('#24323c'), a);
      for (let i = 0; i < 6; i++) gb.box(x - rx * s * (0.9 + i * 0.5) + fx * 0.02, 1.05 + i * 0.42, z - rz * s * (0.9 + i * 0.5) + fz * 0.02, 0.52, 0.1, 0.1, G.col(i % 2 ? '#f0f0f0' : '#c0392b'), a, 0, -s * 0.7);
      gb.cyl(x - rx * s * 0.75, 0.55, z - rz * s * 0.75, 0.1, 1.1, G.col('#f0f0f0'), 8);
    }
    if (g.g) { gb.box(g.x, 7.0, g.z, o * 2 + 1.3, 1.5, 0.9, CR, a); gb.box(g.x, 7.9, g.z, o * 2 + 2.2, 0.3, 1.2, RD, a); gb.box(g.x, 6.15, g.z, o * 2, 0.2, 1.0, GN, a); }
    for (const d of [-7, 7]) gb.box(g.x + fx * d, 0.05, g.z + fz * d, g.w, 0.1, 0.5, G.col('#d4b21a'), a);
  }
  function jet(gb, x, z, a) {
    const C = G.col('#8a9499'), D = G.col('#3a4a55'), fx = Math.sin(a), fz = Math.cos(a);
    gb.cyl(x, 2.2, z, 0.7, 11, C, 10, Math.PI / 2, a); gb.cyl(x + fx * 6.6, 2.2, z + fz * 6.6, 0.7, 2.4, C, 10, Math.PI / 2, a, 0, 0.05); gb.box(x - fx * 0.5, 2.1, z - fz * 0.5, 9, 0.14, 3, C, a); gb.box(x - fx * 5, 2.3, z - fz * 5, 4, 0.1, 1.5, C, a); gb.box(x - fx * 5, 3.5, z - fz * 5, 0.12, 2.4, 1.8, D, a);
    gb.sph(x + fx * 3, 2.75, z + fz * 3, 0.45, 0.4, 1.3, D, 1, a); gb.cyl(x + fx * 2, 0.75, z + fz * 2, 0.07, 1.5, D, 6); gb.cyl(x - fx * 2, 0.75, z - fz * 2, 0.07, 1.5, D, 6); gb.box(x, 0.1, z, 3, 0.2, 10, G.col('#9a968c'), a);
  }

  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color(), _Y = new THREE.Vector3(0, 1, 0);
  function buildProps(ch) {
    const k = key(ch.ci, ch.cj), grp = new THREE.Group(); grp.matrixAutoUpdate = false; ch.props = grp; ch.group.add(grp);
    const inst = [];
    // trees
    const trees = T_.trees.get(k);
    if (trees) { const by = [[], [], [], [], [], []]; for (const t of trees) by[t[2]].push(t);
      by.forEach((list, kind) => { if (!list.length) return; const base = P.treeGeos[kind], g = new THREE.BufferGeometry(); for (const n in base.attributes) g.setAttribute(n, base.attributes[n]); g.setIndex(base.index); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 6, 0), CS);
        const im = new THREE.InstancedMesh(g, P.treeMat, list.length); im.position.set(ch.x, 0, ch.z); im.updateMatrix(); im.matrixAutoUpdate = false; im.castShadow = true; im.receiveShadow = true;
        list.forEach((t, i) => { _q.setFromAxisAngle(_Y, t[4]); _p.set(t[0] - ch.x, 0, t[1] - ch.z); const s = t[3]; _s.set(s * (0.9 + G.h01(i * 7 + kind) * 0.25), s, s * (0.9 + G.h01(i * 11 + kind) * 0.25)); im.setMatrixAt(i, _m4.compose(_p, _q, _s)); const v = 0.78 + G.h01(i * 31 + k) * 0.4; _c.setRGB(v, v * (0.95 + G.h01(i * 5) * 0.1), v * 0.92); im.setColorAt(i, _c); });
        grp.add(im); inst.push(im); });
    }
    const gb = new GB(), lg = new GB(), pg = new GB();
    const lamps = T_.lamps.get(k);
    if (lamps) for (const l of lamps) { const a = l[2], sx = Math.sin(a), sz = Math.cos(a), PC = G.col('#6f7478'); gb.cyl(l[0], 4, l[1], 0.09, 8, PC, 6, 0, 0, 0, 0.06); gb.box(l[0] + sx * 0.9, 7.95, l[1] + sz * 0.9, 0.08, 0.08, 1.9, PC, a); gb.box(l[0] + sx * 1.8, 7.9, l[1] + sz * 1.8, 0.3, 0.12, 0.75, G.col('#3a3d40'), a); lg.box(l[0] + sx * 1.8, 7.82, l[1] + sz * 1.8, 0.22, 0.05, 0.6, [1, 1, 1], a);
      const i = pg.vc, px = l[0] + sx * 1.8, pz = l[1] + sz * 1.8, R = 9; pg.v(px - R, 0.06, pz - R, 0, 1, 0, 0, 0, [1, 1, 1]); pg.v(px + R, 0.06, pz - R, 0, 1, 0, 1, 0, [1, 1, 1]); pg.v(px + R, 0.06, pz + R, 0, 1, 0, 1, 1, [1, 1, 1]); pg.v(px - R, 0.06, pz + R, 0, 1, 0, 0, 1, [1, 1, 1]); pg.i.push(i, i + 2, i + 1, i, i + 3, i + 2); }
    const poles = T_.poles.get(k);
    if (poles) for (const p of poles) { const PC = G.col('#8a8880'), a = p[2]; gb.cyl(p[0], 3.9, p[1], 0.11, 7.8, PC, 6, 0, 0, 0, 0.08); gb.box(p[0], 7.1, p[1], 1.5, 0.09, 0.09, G.col('#4a4a48'), a); gb.box(p[0], 6.5, p[1], 1.1, 0.08, 0.08, G.col('#4a4a48'), a); if (p[3] % 5 === 0) { gb.cyl(p[0] + 0.3, 5.6, p[1], 0.26, 0.75, G.col('#5d6468'), 8); } if (p[3] % 3 === 0) gb.box(p[0], 4.6, p[1], 0.5, 0.5, 0.25, G.col('#2a2a2a'), a + 0.5); }
    const wires = T_.wires.get(k);
    if (wires) { const wp = []; for (const w of wires) { for (let n = 0; n < 6; n++) { const h = n < 3 ? 7.12 : n < 5 ? 6.52 : 5.3, o = (n % 3 - 1) * 0.5, sag = 0.3 + G.h01(w[4] * 7 + n) * (n === 5 ? 0.9 : 0.35); let lx = w[0] + o * 0.3, ly = h, lz = w[1] + o * 0.3; for (let s = 1; s <= 5; s++) { const t = s / 5, x = w[0] + (w[2] - w[0]) * t + o * 0.3, z = w[1] + (w[3] - w[1]) * t + o * 0.3, y = h - Math.sin(t * Math.PI) * sag; wp.push(lx, ly, lz, x, y, z); lx = x; ly = y; lz = z; } } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); const ls = new THREE.LineSegments(g, P.wireMat); ls.matrixAutoUpdate = false; grp.add(ls); ch.disp.push(g); }
    const doors = T_.doors.get(k); if (doors) for (const p of doors) door(gb, p);
    const ks = T_.kiosks.get(k); if (ks) for (const p of ks) kiosk(gb, p);
    const st = T_.stops.get(k); if (st) for (const s of st) shelter(gb, s);
    const gs = T_.gates.get(k); if (gs) for (const g of gs) gate(gb, g);
    const air = T_.air.get(k); if (air) for (const a of air) jet(gb, a[0], a[1], a[2]);
    const sig = T_.signals.get(k);
    if (sig) { const sgb = [0, 1, 2, 3, 4, 5].map(() => new GB()), BK = G.col('#1a1a1a');
      for (const s of sig) { const x = s.x + 5.5, z = s.z + 5.5; gb.cyl(x, 2.9, z, 0.1, 5.8, G.col('#4a4f52'), 6); W.addCircle(x, z, 0.14);
        for (let d = 0; d < 4; d++) { const fx = [1, -1, 0, 0][d], fz = [0, 0, 1, -1][d], grp2 = d < 2 ? 0 : 3; gb.box(x + fx * 0.32, 5.0, z + fz * 0.32, fx ? 0.3 : 0.4, 1.15, fx ? 0.4 : 0.3, BK); for (let c = 0; c < 3; c++) sgb[grp2 + c].sph(x + fx * 0.5, 5.36 - c * 0.36, z + fz * 0.5, 0.12, 0.12, 0.12, [1, 1, 1], 1); } }
      sgb.forEach((b, i) => { if (b.vc) { const m = new THREE.Mesh(b.build(true), P.sigMats[i]); m.matrixAutoUpdate = false; grp.add(m); ch.disp.push(m.geometry); } }); }
    if (gb.vc) { const m = new THREE.Mesh(gb.build(true), P.propMat); m.castShadow = true; m.receiveShadow = true; m.matrixAutoUpdate = false; grp.add(m); ch.disp.push(m.geometry); }
    if (lg.vc) { const m = new THREE.Mesh(lg.build(true), P.lampMat); m.matrixAutoUpdate = false; grp.add(m); ch.disp.push(m.geometry); const pm = new THREE.Mesh(pg.build(), P.poolMat); pm.matrixAutoUpdate = false; pm.renderOrder = 4; grp.add(pm); ch.disp.push(pm.geometry); }
    ch.onDispose = () => { for (const im of inst) im.dispose(); };
  }

  // ---------- name signs ----------
  P.signText = function (p) {
    if (p.c === 'bus') return [p.n, 'BUS STOP'];
    if (p.c === 'gate') return [p.n.toUpperCase(), 'DHAKA CANTONMENT'];
    if (p.c === 'vip') { const b = G.BOYS && G.BOYS[+p.n]; return G.boysUnlocked && b ? [b.name, b.villa ? 'PRIVATE VILLA' : b.army ? 'OFFICER BUNGALOW' : b.lake ? 'LAKESIDE DUPLEX' : 'DUPLEX RESIDENCE'] : ['Private Residence', 'MEMBERS ONLY']; }
    if (p.c === 'armory') return ['ARMORY', 'AUTHORISED ONLY'];
    if (p.c === 'property') return [p.n, G.state && G.state.owned && G.state.owned[p.id] ? 'YOUR PROPERTY' : 'FOR SALE'];
    return [p.n, (P.CAT[p.c] || P.CAT.store).label];
  };
  function drawSign(s, p) {
    const x = s.x, cat = P.CAT[p.c] || P.CAT.store, [title, sub] = P.signText(p);
    const g = x.createLinearGradient(0, 0, 0, 128); const c = new THREE.Color(cat.col); g.addColorStop(0, '#' + c.clone().multiplyScalar(1.25).getHexString()); g.addColorStop(1, '#' + c.clone().multiplyScalar(0.7).getHexString());
    x.fillStyle = g; x.fillRect(0, 0, 512, 128); x.strokeStyle = 'rgba(255,255,255,0.85)'; x.lineWidth = 5; x.strokeRect(5, 5, 502, 118);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; let fs = 54; x.font = `bold ${fs}px "Segoe UI","Nirmala UI",Arial,sans-serif`; while (x.measureText(title).width > 470 && fs > 22) { fs -= 3; x.font = `bold ${fs}px "Segoe UI","Nirmala UI",Arial,sans-serif`; }
    x.fillText(title, 256, 52); x.font = 'bold 22px "Segoe UI",Arial,sans-serif'; x.fillStyle = 'rgba(255,255,255,0.82)'; x.fillText(sub, 256, 100);
    s.t.needsUpdate = true;
  }
  P.refreshSigns = function () { for (const s of P.signs) s.poi = null; P.timer = 0; };
  P.update = function (dt, px, pz, night, time) {
    P.windU.value.x += dt; P.windU.value.y = 0.6 + (G.env.wind || 1) * 0.9;
    P.lampMat.emissiveIntensity = night > 0.3 ? 5 : 0; P.poolMat.opacity = night * 0.42;
    const t = time % 40, A = t < 16 ? 2 : t < 19 ? 1 : 0, B = t < 20 ? 0 : t < 36 ? 2 : t < 39 ? 1 : 0; P.sigA = A; P.sigB = B;
    for (let i = 0; i < 3; i++) { P.sigMats[i].emissiveIntensity = (2 - i) === A ? 3.5 : 0.04; P.sigMats[3 + i].emissiveIntensity = (2 - i) === B ? 3.5 : 0.04; }
    for (const s of P.signs) s.mesh.material.emissiveIntensity = night * 0.85;
    P.timer -= dt; if (P.timer > 0) return; P.timer = 0.35;
    const near = P.near; near.length = 0; const R = 80;
    for (let i = Math.floor((px - R) / 50); i <= Math.floor((px + R) / 50); i++) for (let j = Math.floor((pz - R) / 50); j <= Math.floor((pz + R) / 50); j++) { const a = W.poiGrid.get(key(i, j)); if (a) for (const p of a) { const d = Math.hypot(p.x - px, p.z - pz); if (d < R) { p._d = d; near.push(p); } } }
    for (const s of W.stops) { const d = Math.hypot(s.sx - px, s.sz - pz); if (d < R) { s._d = d; near.push(s); } }
    for (const g of W.checkpoints) { const d = Math.hypot(g.x - px, g.z - pz); if (d < 140) { g._d = d * 0.3; near.push(g); } }
    near.sort((a, b) => a._d - b._d);
    const want = []; for (const p of near) { if (p.c === 'house' || (p.c === 'gate' && !p.g)) continue; want.push(p); if (want.length >= P.signs.length) break; }
    const have = new Set(); for (const s of P.signs) { if (s.poi && want.includes(s.poi)) have.add(s.poi); else { s.poi = null; s.mesh.visible = false; } }
    for (const p of want) { if (have.has(p)) continue; const s = P.signs.find(q => !q.poi); if (!s) break; s.poi = p; drawSign(s, p); const m = s.mesh;
      if (p.c === 'bus') { m.position.set(p.sx + Math.sin(p.a) * 0.36, 2.25, p.sz + Math.cos(p.a) * 0.36); m.rotation.y = p.a; m.scale.set(1, 0.8, 1); }
      else if (p.c === 'gate') { m.position.set(p.x + Math.sin(p.a) * 0.48, 7.0, p.z + Math.cos(p.a) * 0.48); m.rotation.y = p.a; const sc = Math.min(3.2, (p.w + 1.5) / 3.1); m.scale.set(sc, 1.5, 1); }
      else if (p.kiosk) { m.position.set(p.x - Math.sin(p.a) * 0.05, 2.62, p.z - Math.cos(p.a) * 0.05); m.rotation.y = p.a; m.scale.set(0.8, 0.6, 1); }
      else { const res = p.c === 'home' || p.c === 'property' || p.c === 'vip'; m.position.set(p.x + Math.sin(p.a) * (res ? 0.3 : 0.18), res ? 2.95 : 3.2, p.z + Math.cos(p.a) * (res ? 0.3 : 0.18)); m.rotation.y = p.a; m.scale.set(res ? 0.72 : 1, res ? 0.62 : 1, 1); }
      m.visible = true; }
    // door rings for the closest entrances
    let ri = 0; for (const p of near) { if (ri >= P.rings.length || p._d > 26) break; if (p.c === 'gate' || p.c === 'bus') continue; const m = P.rings[ri++]; m.visible = true; m.position.set(p.x + Math.sin(p.a) * 1.0, 0.07, p.z + Math.cos(p.a) * 1.0); m.material.color.set((P.CAT[p.c] || P.CAT.store).col); }
    for (; ri < P.rings.length; ri++) P.rings[ri].visible = false;
  };
})();
