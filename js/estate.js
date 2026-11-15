'use strict';
// Special places: Sifar's gated villa compound (walls, sliding gate, towers, guards, garage, armory, pool, Zelda the cat)
// and the navy dock on the lake for Irtiza's patrol boat.
(function () {
  const G = window.G, GB = G.GB, W = G.world, col = G.col;
  const E = G.estate = { gateOpen: 0, guards: null, treeSpots: [], spots: [] };
  G.worldSpots = E.spots;
  let S, ca, sa;
  const L = (u, v) => [S.x + u * ca + v * sa, S.z - u * sa + v * ca];
  const toLocal = (x, z) => [(x - S.x) * ca - (z - S.z) * sa, (x - S.x) * sa + (z - S.z) * ca];
  E.toLocal = toLocal; E.toWorld = (u, v) => L(u, v);
  E.contains = function (x, z, m) { if (!S) return false; const q = toLocal(x, z); return Math.abs(q[0]) < S.w / 2 + (m || 0) && Math.abs(q[1]) < S.d / 2 + (m || 0); };
  E.keepClear = function (x, z) { if (!S) return false; const q = toLocal(x, z); return (Math.abs(q[0]) < S.w / 2 + 2.5 && Math.abs(q[1]) < S.d / 2 + 2.5) || (q[0] > -17 && q[0] < -3 && q[1] > 0 && q[1] < S.d / 2 + 16); };
  function kit(gb, a0) { // local builder: u right, v forward (towards the road)
    return {
      box(u, y, v, su, sy, sv, c, ry, rx) { const p = L(u, v); gb.box(p[0], y, p[1], su, sy, sv, typeof c === 'string' ? col(c) : c, S.a + (ry || 0), rx); return this; },
      cyl(u, y, v, r, h, c, seg, rx, rz, rt) { const p = L(u, v); gb.cyl(p[0], y, p[1], r, h, col(c), seg || 10, rx || 0, S.a, rz || 0, rt); return this; },
      sph(u, y, v, sx, sy, sz, c) { const p = L(u, v); gb.sph(p[0], y, p[1], sx, sy, sz, col(c), 8, S.a); return this; }
    };
  }
  const solid = (u0, v0, u1, v1, h) => { const a = L(u0, v0), b = L(u1, v0), c = L(u1, v1), d = L(u0, v1); return W.addSolid([a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]], h); };
  const circle = (u, v, r) => { const p = L(u, v); W.addCircle(p[0], p[1], r); };
  function flat(scene, rects, mat, order, y, uv) { const gb = new GB(), W1 = [1, 1, 1]; for (const r of rects) { const a = L(r[0], r[1]), b = L(r[2], r[1]), c = L(r[2], r[3]), d = L(r[0], r[3]), i = gb.vc; for (const q of [a, b, c, d]) gb.v(q[0], y, q[1], 0, 1, 0, q[0] / uv, q[1] / uv, W1); gb.i.push(i, i + 2, i + 1, i, i + 3, i + 2, i, i + 1, i + 2, i, i + 2, i + 3); } const m = new THREE.Mesh(gb.build(), mat); m.renderOrder = order; m.receiveShadow = true; m.matrixAutoUpdate = false; scene.add(m); return m; }

  E.BAYS = [-24.6, -19.8, -15, -10.2, -5.4];
  E.bay = function (i) { const p = L(-25.4, E.BAYS[i]); return { x: p[0], z: p[1], h: S.a + Math.PI / 2 }; };
  E.park = function (id, bayI, boy) { const b = E.bay(bayI); for (const v of G.Veh.list.slice()) if (v.ownKey === 'villa' + bayI && v.driver !== 'player') v.remove(); const v = G.Veh.create(id, b.x, b.z, b.h, {}); v.keep = true; v.owned = true; v.boyCar = boy; v.ownKey = 'villa' + bayI; return v; };

  E.init = function (scene) {
    E.scene = scene; buildDock(scene);
    S = E.S = W.villaSpec; if (!S) return; ca = Math.cos(S.a); sa = Math.sin(S.a);
    const T = G.T, hw = S.w / 2, hd = S.d / 2, gb = new GB(), gl = new GB(), lt = new GB(), k = kit(gb), kg = kit(gl), kl = kit(lt);
    E.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.68, metalness: 0.06 });
    E.glassMat = new THREE.MeshStandardMaterial({ color: 0x0f1a22, roughness: 0.05, metalness: 0.85, envMapIntensity: 1.7, emissive: 0xffd9a0, emissiveIntensity: 0 });
    E.lightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff0d0, emissiveIntensity: 0 });
    const WALL = '#e9e7e1', CAP = '#24282c', STONE = '#2b2f33', WOOD = '#5a4030', WOOD2 = '#4a3626', WHT = '#f1efe9', CON = '#8f9296', DKM = '#1c1f22';
    // ---- ground
    const lawn = new THREE.MeshStandardMaterial({ map: T.grass, color: 0xcfe8b8, roughness: 0.95, depthWrite: false });
    flat(scene, [[-hw, -hd, hw, hd]], lawn, -15.6, 0.012, 9);
    const pavT = T.road.lane.clone(); pavT.needsUpdate = true; const pav = new THREE.MeshStandardMaterial({ map: pavT, color: 0x9a9da2, roughness: 0.85, depthWrite: false });
    flat(scene, [[-14.5, -27.5, -5.5, hd + 6 + S.rw / 2], [-20.4, -27.5, -14.5, -2.4], [-31.4, -27.2, -20.4, -2.8], [-5.5, -5.2, 9, -1.4], [-23, 10.6, -14.5, 13.4], [0, -6, 28, -1.2]], pav, -15, 0.016, 5);
    const poolMat = W.waterMat.clone(); poolMat.color.set(0x2a8fb8); flat(scene, [[9.6, 5.6, 24.4, 14.4], [2.9, 18.9, 5.1, 21.1]], poolMat, -14, 0.05, 20);
    // ---- perimeter wall
    const wallU = (u0, u1, v) => { const m = (u0 + u1) / 2, l = u1 - u0; k.box(m, 1.4, v, l, 2.8, 0.4, WALL).box(m, 2.86, v, l + 0.1, 0.12, 0.52, CAP).box(m, 0.18, v, l + 0.04, 0.36, 0.46, '#b9b6ae'); kl.box(m, 2.74, v - Math.sign(v) * 0.215, l - 0.4, 0.04, 0.03, [1, 1, 1]); solid(u0, v - 0.2, u1, v + 0.2, 2.9); };
    const wallV = (v0, v1, u) => { const m = (v0 + v1) / 2, l = v1 - v0; k.box(u, 1.4, m, 0.4, 2.8, l, WALL).box(u, 2.86, m, 0.52, 0.12, l + 0.1, CAP).box(u, 0.18, m, 0.46, 0.36, l + 0.04, '#b9b6ae'); kl.box(u - Math.sign(u) * 0.215, 2.74, m, 0.03, 0.04, l - 0.4, [1, 1, 1]); solid(u - 0.2, v0, u + 0.2, v1, 2.9); };
    wallU(-hw, hw, -hd); wallV(-hd, hd, -hw); wallV(-hd, hd, hw); wallU(-hw, -13.7, hd); wallU(-6.3, hw, hd);
    for (const u of [-13.7, -6.3]) { k.box(u, 1.65, hd, 0.8, 3.3, 0.8, STONE).box(u, 3.34, hd, 0.95, 0.1, 0.95, CAP); kl.sph(u, 3.5, hd, 0.14, 0.14, 0.14, '#ffffff'); circle(u, hd, 0.5); }
    k.box(-10, 0.03, hd - 0.42, 15, 0.05, 0.1, '#55585c').box(-5.6, 1.5, hd + 0.42, 0.22, 0.34, 0.08, DKM); kl.box(-5.6, 1.56, hd + 0.47, 0.1, 0.07, 0.02, [0.3, 1.2, 0.5]);
    // ---- house: ground block, cantilevered upper floor, roof
    k.box(14, 1.7, -15, 28, 3.4, 18, WHT); solid(0, -24, 28, -6, 7);
    k.box(10.5, 5.15, -12.25, 27, 3.5, 19.5, WOOD2); for (let i = 0; i < 27; i++) k.box(-2.8 + i, 5.15, -2.46, 0.12, 3.4, 0.06, i % 2 ? WOOD : '#3e2c1e');
    k.box(10.5, 7.03, -12.25, 28.2, 0.26, 20.7, CAP).box(10.5, 3.36, -12.25, 27.3, 0.12, 19.8, CAP);
    for (const u of [-2.4, 23.4]) { k.box(u, 1.7, -2.9, 0.24, 3.4, 0.24, CAP); circle(u, -2.9, 0.22); }
    kg.box(18.5, 1.55, -5.96, 17, 2.8, 0.06, [1, 1, 1]); for (let i = 0; i <= 5; i++) k.box(10 + i * 3.4, 1.55, -5.93, 0.08, 2.8, 0.1, DKM); k.box(18.5, 2.98, -5.93, 17.1, 0.08, 0.1, DKM);
    kg.box(10.5, 5.2, -2.47, 20, 2.3, 0.08, [1, 1, 1]); for (let i = 0; i <= 5; i++) k.box(0.5 + i * 4, 5.2, -2.42, 0.08, 2.3, 0.1, DKM);
    kg.box(24.03, 5.2, -12, 0.06, 2.2, 12, [1, 1, 1]).box(-3.03, 5.2, -12, 0.06, 2.0, 9, [1, 1, 1]).box(28.02, 1.7, -15, 0.06, 1.6, 9, [1, 1, 1]).box(14, 1.9, -24.02, 16, 1.3, 0.06, [1, 1, 1]).box(10, 5.3, -22.02, 18, 1.5, 0.06, [1, 1, 1]);
    k.box(6, 2.75, -5.3, 3.6, 0.1, 1.6, CAP).box(14, 0.06, -3.6, 28, 0.12, 4.8, '#7a5a3c'); for (let i = 0; i < 3; i++) k.box(6, 0.04 + i * 0.04, -0.9 - i * 0.2, 4, 0.1, 0.4, '#8f9296');
    for (const u of [4, 12, 20]) { k.box(u, 7.3, -17, 2.6, 0.08, 1.6, '#16263a', 0, -0.3).box(u, 7.2, -17.6, 2.6, 0.2, 0.06, CON); } k.box(22, 7.5, -9, 1.6, 0.7, 1.2, '#b9bcc0').box(19.6, 7.5, -9, 1.6, 0.7, 1.2, '#b9bcc0');
    for (const u of [9, 13, 17, 21, 25]) kl.box(u, 3.28, -4.2, 0.26, 0.03, 0.26, [1, 1, 1]);
    // ---- pool, loungers, fountain
    k.box(17, 0.1, 5.3, 16, 0.2, 0.6, '#e2ded4').box(17, 0.1, 14.7, 16, 0.2, 0.6, '#e2ded4').box(9.3, 0.1, 10, 0.6, 0.2, 10, '#e2ded4').box(24.7, 0.1, 10, 0.6, 0.2, 10, '#e2ded4');
    for (const u of [11, 14, 17]) { k.box(u, 0.28, 17.4, 0.75, 0.08, 1.9, '#f4f4f0').box(u, 0.5, 18.2, 0.75, 0.08, 0.7, '#f4f4f0', 0, -0.7).box(u, 0.14, 17.4, 0.6, 0.2, 1.5, '#7a5a3c'); } k.cyl(20, 1.2, 17.6, 0.04, 2.4, '#ddd', 6).cyl(20, 2.35, 17.6, 1.5, 0.3, '#c0392b', 12, 0, 0, 0.08);
    k.cyl(4, 0.25, 20, 1.5, 0.5, '#d8d4ca', 20).cyl(4, 0.7, 20, 0.2, 1.0, '#d8d4ca', 10).cyl(4, 1.15, 20, 0.6, 0.12, '#d8d4ca', 14); circle(4, 20, 1.5);
    for (let v = -26; v <= 28; v += 6) for (const u of [-14.9, -5.1]) { k.cyl(u, 0.3, v, 0.045, 0.6, DKM, 6); kl.sph(u, 0.66, v, 0.09, 0.09, 0.09, '#ffffff'); }
    // ---- garage (carport with 4 car bays and a bike bay)
    k.box(-25.8, 3.12, -15, 11.6, 0.26, 24.8, CAP).box(-25.8, 2.95, -15, 11.2, 0.08, 24.4, '#d9d7d1');
    for (const v of [-27.3, -2.7]) { k.box(-26, 1.5, v, 11.2, 3.0, 0.3, WALL); solid(-31.6, v - 0.15, -20.4, v + 0.15, 3); }
    for (const v of [-27, -22.2, -17.4, -12.6, -7.8, -3]) { k.box(-20.4, 1.5, v, 0.3, 3.0, 0.3, CAP); circle(-20.4, v, 0.25); }
    for (const v of [-22.2, -17.4, -12.6, -7.8]) k.box(-25.6, 0.022, v, 9.6, 0.012, 0.1, '#e0c23a');
    kl.box(-20.5, 2.9, -15, 0.06, 0.05, 24, [1, 1, 1]); for (const v of E.BAYS) kl.box(-26, 2.9, v, 2.4, 0.04, 0.2, [1, 1, 1]);
    k.box(-31, 0.9, -24.5, 0.6, 1.8, 1.6, '#b3201a').box(-31, 0.5, -5.5, 0.7, 1.0, 1.4, '#3a3d40'); for (let i = 0; i < 3; i++) k.cyl(-30.8, 0.14 + i * 0.26, -8.2, 0.36, 0.24, '#141414', 14);
    // ---- armory (separate bunker inside the wall)
    k.box(-27.2, 1.65, 12, 8.4, 3.3, 10, '#3b4046').box(-27.2, 3.38, 12, 8.8, 0.16, 10.4, CAP).box(-22.98, 0.5, 12, 0.05, 0.3, 10, '#e0c23a'); solid(-31.4, 7, -23, 17, 3.4);
    for (let i = 0; i < 10; i++) k.box(-22.97, 0.5, 7.5 + i, 0.06, 0.3, 0.5, i % 2 ? '#e0c23a' : '#151515'); k.cyl(-29.5, 4.4, 15, 0.03, 2.2, DKM, 5); kl.box(-22.9, 2.9, 12, 0.05, 0.12, 1.6, [1.3, 0.3, 0.2]);
    // ---- guard booth + towers
    k.box(-3.6, 1.2, 26.4, 2.2, 2.4, 2.2, '#d9d7d1').box(-3.6, 2.46, 26.4, 2.6, 0.12, 2.6, CAP); kg.box(-4.72, 1.5, 26.4, 0.05, 0.9, 1.5, [1, 1, 1]); solid(-4.7, 25.3, -2.5, 27.5, 2.5);
    E.towers = [[-28.6, 25.6], [28.6, 25.6], [28.6, -25.6], [-28.6, -25.6]];
    for (const [u, v] of E.towers) {
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { k.cyl(u + a * 1.1, 2.5, v + b * 1.1, 0.09, 5, STONE, 6); circle(u + a * 1.1, v + b * 1.1, 0.16); k.cyl(u + a * 1.25, 6.4, v + b * 1.25, 0.05, 2.6, STONE, 5); }
      for (let y = 1.2; y < 5; y += 1.25) { k.box(u, y, v - 1.1, 2.2, 0.06, 0.06, STONE).box(u, y, v + 1.1, 2.2, 0.06, 0.06, STONE).box(u - 1.1, y, v, 0.06, 0.06, 2.2, STONE).box(u + 1.1, y, v, 0.06, 0.06, 2.2, STONE); }
      k.box(u, 5.0, v, 2.9, 0.16, 2.9, '#3a3d40').box(u, 7.75, v, 3.5, 0.14, 3.5, CAP);
      for (const [a, b, w, d2] of [[0, -1.4, 2.9, 0.08], [0, 1.4, 2.9, 0.08], [-1.4, 0, 0.08, 2.9], [1.4, 0, 0.08, 2.9]]) k.box(u + a, 5.6, v + b, w, 1.05, d2, '#4a4f55');
      const iu = -Math.sign(u), iv = -Math.sign(v); for (let y = 0.3; y < 5; y += 0.4) k.box(u + iu * 1.5, y, v, 0.05, 0.05, 0.5, '#888'); k.box(u + iu * 1.5, 2.5, v - 0.25, 0.05, 5, 0.05, '#888').box(u + iu * 1.5, 2.5, v + 0.25, 0.05, 5, 0.05, '#888');
      kl.sph(u - iu * 1.3, 7.45, v - iv * 1.3, 0.2, 0.2, 0.2, '#ffffff');
    }
    const add = (g, mat, sh) => { const m = new THREE.Mesh(g.build(true), mat); m.castShadow = m.receiveShadow = !!sh; m.matrixAutoUpdate = false; scene.add(m); return m; };
    add(gb, E.mat, true); add(gl, E.glassMat, false); add(lt, E.lightMat, false);
    // ---- sliding gate (separate mesh, slides along the wall)
    { const g = new GB(); g.box(0, 1.3, 0, 7.5, 2.5, 0.1, col(DKM)); for (let i = 0; i < 9; i++) g.box(0, 0.3 + i * 0.26, 0.07, 7.3, 0.16, 0.05, col(i % 2 ? '#2b3036' : '#3a4048')); for (const x of [-3.7, 0, 3.7]) g.box(x, 1.3, 0.08, 0.14, 2.5, 0.08, col('#111')); g.cyl(-3, 0.09, 0, 0.09, 0.12, col('#555'), 8, 0, 0, Math.PI / 2); g.cyl(3, 0.09, 0, 0.09, 0.12, col('#555'), 8, 0, 0, Math.PI / 2);
      const m = E.gate = new THREE.Mesh(g.build(true), E.mat); m.castShadow = true; m.rotation.y = S.a; scene.add(m); E.gateSolid = solid(-13.7, hd - 0.75, -6.3, hd - 0.35, 2.6); placeGate(); }
    // ---- name plaque
    { const [c, x] = G.cv(512, 160); x.fillStyle = '#0d0e10'; x.fillRect(0, 0, 512, 160); x.strokeStyle = '#c9a227'; x.lineWidth = 6; x.strokeRect(8, 8, 496, 144); x.fillStyle = '#c9a227'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = 'bold 46px Georgia,serif'; x.fillText('SIFAR MAHFUZ ADNAN', 256, 62, 470); x.font = '26px Georgia,serif'; x.fillText('PRIVATE VILLA', 256, 116); const t = G.mkTex(c, { clamp: true });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.0), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.15, roughness: 0.4 })); const p = L(-1.6, hd + 0.21); m.position.set(p[0], 1.75, p[1]); m.rotation.y = S.a; scene.add(m); E.plaque = m; }
    // ---- doors into the house and the armory
    { const p = L(6, -5.98); E.housePoi = W.addPoi({ c: 'vip', n: '14', x: p[0], z: p[1], a: S.a, b: -1 }); const r = L(-10, hd + 6 + S.rw / 2); E.housePoi.rx = r[0]; E.housePoi.rz = r[1];
      const q = L(-22.98, 12); E.armoryPoi = W.addPoi({ c: 'armory', n: 'Private Armory', x: q[0], z: q[1], a: S.a + Math.PI / 2, b: -1 }); }
    for (const [u, v, kd] of [[30, 22, 3], [28, 0, 3], [2, 26, 3], [29, -27, 3], [-17, 22, 2], [-17, 3, 3], [22, 24, 3], [-2, 14, 5], [8, 24, 5], [26, 16.5, 5], [-17, -1.2, 5]]) { const p = L(u, v); E.treeSpots.push([p[0], p[1], kd]); }
    buildCat(scene);
    E.center = { x: S.x, z: S.z }; const gp = L(-10, hd); E.gatePos = { x: gp[0], z: gp[1] };
  };
  function placeGate() { const p = L(-10 + E.gateOpen * 7.5, S.d / 2 - 0.55); E.gate.position.set(p[0], 0, p[1]); E.gateSolid.off = E.gateOpen > 0.5; }

  // ---------- navy dock ----------
  function buildDock(scene) {
    const D = W.dock; if (!D) return; const dx = Math.sin(D.a), dz = Math.cos(D.a), px = dz, pz = -dx, gb = new GB(), WD = col('#7a5a3c'), WD2 = col('#5a4030'), a0 = { x: D.x - dx * 3, z: D.z - dz * 3 }, a1 = { x: D.x + dx * 11, z: D.z + dz * 11 };
    for (let t = -3; t < 11; t += 0.5) gb.box(D.x + dx * (t + 0.25), 0.2, D.z + dz * (t + 0.25), 2.4, 0.08, 0.44, t % 1 ? WD : WD2, D.a);
    for (let t = -2; t <= 11; t += 2.6) for (const s of [-1, 1]) gb.cyl(D.x + dx * t + px * s * 1.15, 0.35, D.z + dz * t + pz * s * 1.15, 0.09, 1.3, WD2, 7);
    gb.cyl(D.x + dx * 10.6 + px * 1.15, 1.6, D.z + dz * 10.6 + pz * 1.15, 0.04, 2.6, col('#ddd'), 6); gb.box(D.x + dx * 10.6 + px * 1.15, 2.7, D.z + dz * 10.6 + pz * 1.15, 0.5, 0.34, 0.03, col('#0f6b47'), D.a + Math.PI / 2);
    gb.box(D.x - dx * 2.6 + px * 1.6, 1.0, D.z - dz * 2.6 + pz * 1.6, 1.1, 0.6, 0.06, col('#1f3a5f'), D.a); gb.cyl(D.x - dx * 2.6 + px * 1.6, 0.5, D.z - dz * 2.6 + pz * 1.6, 0.04, 1.0, col('#ddd'), 6);
    for (const t of [2, 6]) gb.sph(D.x + dx * t - px * 1.3, 0.22, D.z + dz * t - pz * 1.3, 0.3, 0.3, 0.3, col('#e06a1a'), 8);
    const m = new THREE.Mesh(gb.build(true), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })); m.castShadow = m.receiveShadow = true; m.matrixAutoUpdate = false; scene.add(m);
    W.docks.push([a0.x, a0.z, a1.x, a1.z, 1.35]); E.dock = { x: D.x, z: D.z, a: D.a, bx: D.x + dx * 7.5 - px * 2.95, bz: D.z + dz * 7.5 - pz * 2.95, ex: D.x + dx * 9, ez: D.z + dz * 9 };
  }
  E.spawnBoat = function (boy) { const d = E.dock; if (!d) return null; for (const v of G.Veh.list.slice()) if (v.id === 'boat' && v.driver !== 'player') v.remove(); let bh = d.a, best = -1; for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; let run = 0; while (run < 400 && W.inWaterRaw(d.bx + Math.sin(a) * (run + 6), d.bz + Math.cos(a) * (run + 6))) run += 6; const sc = run - Math.abs(G.wrapPi(a - d.a)) * 12; if (sc > best) { best = sc; bh = a; } }
    const v = G.Veh.create('boat', d.bx, d.bz, bh, {}); v.keep = true; v.owned = true; v.boyCar = boy; v.ownKey = 'boat'; return v; };

  // ---------- Zelda the cat ----------
  const CATPTS = [[3, 23], [15, 20.5], [27, 20], [27, 2], [15, 1.5], [5, 1.5], [5.5, 12], [6, -3.6], [-9, 12], [-9, -6]], CATNB = [[1, 6, 8], [0, 2], [1, 3], [2, 4], [3, 5], [4, 6, 7], [5, 0, 8], [5], [0, 6, 9], [8]];
  function buildCat(scene) {
    const g = new GB(), FUR = col('#8b9097'), DK = col('#5a5f66'), WH = col('#f2f2f0'), PK = col('#e8a0a8');
    g.sph(0, 0.2, 0, 0.085, 0.085, 0.2, FUR, 8); g.sph(0, 0.185, 0.13, 0.07, 0.072, 0.085, WH, 8); g.sph(0, 0.31, 0.25, 0.076, 0.07, 0.074, FUR, 8); g.sph(0, 0.285, 0.31, 0.036, 0.03, 0.03, WH, 8); g.sph(0, 0.292, 0.338, 0.008, 0.007, 0.006, PK, 1);
    for (const s of [-1, 1]) { g.cyl(s * 0.042, 0.385, 0.245, 0.03, 0.065, FUR, 4, 0, 0, s * -0.2, 0.002); g.sph(s * 0.03, 0.325, 0.31, 0.012, 0.013, 0.008, col('#7ac96a'), 1); g.sph(s * 0.03, 0.325, 0.316, 0.005, 0.01, 0.004, col('#101010'), 1); g.cyl(s * 0.05, 0.08, 0.12, 0.021, 0.16, FUR, 6); g.cyl(s * 0.05, 0.08, -0.12, 0.023, 0.16, FUR, 6); g.sph(s * 0.05, 0.018, 0.128, 0.024, 0.018, 0.03, WH, 1); g.sph(s * 0.05, 0.018, -0.112, 0.024, 0.018, 0.03, WH, 1); }
    for (let i = 0; i < 5; i++) g.box(0, 0.282, -0.13 + i * 0.065, 0.13, 0.012, 0.02, DK);
    const body = new THREE.Mesh(g.build(true), G.Char.mat); body.castShadow = true;
    const t = new GB(); for (let i = 0; i < 5; i++) t.cyl(0, 0.03 + i * 0.055, -i * 0.012, 0.016 - i * 0.0015, 0.06, i % 2 ? DK : FUR, 6, -0.2); const tail = new THREE.Mesh(t.build(true), G.Char.mat); tail.position.set(0, 0.24, -0.19); tail.rotation.x = -0.5;
    const root = new THREE.Group(); root.add(body); root.add(tail); root.scale.setScalar(1.25); scene.add(root);
    const [c, x] = G.cv(256, 64); x.font = 'bold 40px "Segoe UI",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 6; x.strokeStyle = '#000'; x.strokeText('Zelda', 128, 34); x.fillStyle = '#ffd98a'; x.fillText('Zelda', 128, 34);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.mkTex(c, { clamp: true }), transparent: true, depthWrite: false })); tag.scale.set(0.9, 0.225, 1); tag.position.y = 0.62; root.add(tag);
    const p = L(CATPTS[5][0], CATPTS[5][1]); const cat = E.cat = { root, body, tail, tag, x: p[0], z: p[1], h: 0, node: 5, tx: p[0], tz: p[1], state: 'sit', t: 3, meow: 6 };
    cat.spot = { x: cat.x, z: cat.z, r: 1.7, label: 'Pet Zelda', fn: () => { if (G.audio) G.audio.purr(); G.ui.subtitle('Zelda purrs and rubs against your leg.'); G.player.heal(5); cat.state = 'sit'; cat.t = 5; } }; E.spots.push(cat.spot);
  }
  function catUpdate(dt, pl, near) {
    const c = E.cat; if (!c) return; c.root.visible = near; if (!near) return; const d = Math.hypot(pl.pos.x - c.x, pl.pos.z - c.z), onFoot = pl.mode === 'foot';
    c.t -= dt; c.meow -= dt; if (c.meow <= 0) { c.meow = 9 + Math.random() * 14; if (d < 14 && G.audio && onFoot) G.audio.meow(); }
    let sp = 0;
    if (c.state === 'sit') { if (c.t <= 0) { if (onFoot && d < 7 && d > 1.6 && Math.random() < 0.6 && E.contains(pl.pos.x, pl.pos.z, -1)) { c.state = 'follow'; c.t = 6; } else { const nb = CATNB[c.node], n = nb[(Math.random() * nb.length) | 0], p = L(CATPTS[n][0] + (Math.random() - 0.5), CATPTS[n][1] + (Math.random() - 0.5)); c.node = n; c.tx = p[0]; c.tz = p[1]; c.state = 'walk'; } } }
    else if (c.state === 'follow') { c.tx = pl.pos.x; c.tz = pl.pos.z; if (c.t <= 0 || d < 0.9 || !E.contains(pl.pos.x, pl.pos.z, -1)) { c.state = 'sit'; c.t = 3 + Math.random() * 4; const p = L(CATPTS[c.node][0], CATPTS[c.node][1]); if (d >= 0.9) { c.tx = p[0]; c.tz = p[1]; c.state = 'walk'; } } else sp = 1.5; }
    if (c.state === 'walk') { sp = 0.9; if (Math.hypot(c.tx - c.x, c.tz - c.z) < 0.25) { c.state = 'sit'; c.t = 2 + Math.random() * 7; sp = 0; } }
    if (sp > 0) { const dx = c.tx - c.x, dz = c.tz - c.z, l = Math.hypot(dx, dz) || 1; c.h = G.angLerp(c.h, Math.atan2(dx, dz), 1 - Math.exp(-7 * dt)); c.x += dx / l * sp * dt; c.z += dz / l * sp * dt; }
    const sit = c.state === 'sit'; c.sitK = G.damp(c.sitK || 0, sit ? 1 : 0, 6, dt);
    c.root.position.set(c.x, sp > 0 ? Math.abs(Math.sin(G.time * 9)) * 0.012 : 0, c.z); c.root.rotation.y = c.h; c.body.rotation.x = -c.sitK * 0.42; c.body.position.y = -c.sitK * 0.02; c.tail.rotation.z = Math.sin(G.time * (sp > 0 ? 5 : 1.6)) * 0.45; c.tail.rotation.x = -0.5 + c.sitK * 0.5;
    c.tag.visible = d < 14; c.spot.x = onFoot ? c.x : 1e9; c.spot.z = c.z;
  }

  // ---------- guards ----------
  function spawnGuards() {
    const N = G.npc, hd = S.d / 2, list = E.guards = [];
    const mk = (u, v, ha, opt) => { const p = L(u, v); const g = new N.Ped(p[0], p[1], 'sec', null, Object.assign({ state: 'guard' }, opt || {})); g.keep = true; g.gh = S.a + ha; g.heading = g.gh; g.sync(); list.push(g); return g; };
    E.towers.forEach(([u, v], i) => mk(u, v, Math.atan2(Math.sign(u), Math.sign(v)), { fy: 5.1, weapon: i % 2 ? 'sniper' : 'carbine' }));
    mk(-15.2, hd + 1.4, 0); mk(-4.8, hd + 1.4, 0); mk(-13, hd - 2.6, Math.PI); mk(-7, hd - 2.6, Math.PI); mk(4.4, -4.4, 0); mk(7.7, -4.4, 0); mk(-21.6, 13.6, Math.PI / 2, { weapon: 'shotgun' }); mk(-18.6, -14, Math.PI / 2);
    const route = [[-18, 24], [29.5, 24], [29.5, -26.5], [-1.6, -26.5], [-1.6, -1.2], [-18, -1.2]].map(q => L(q[0], q[1]));
    for (let i = 0; i < 4; i++) { const g = mk(route[i][0] * 0 + [-18, 29.5, 29.5, -1.6][i], [24, 24, -26.5, -26.5][i], 0, { state: 'patrol' }); g.route = route; g.ri = i + 1; g.wait = 0; }
  }
  E.update = function (dt) {
    if (!S) return; const pl = G.player, px = pl.pos.x, pz = pl.pos.z, d = Math.hypot(px - S.x, pz - S.z), night = G.env.night, interior = pl.mode === 'interior';
    E.glassMat.emissiveIntensity = night * 0.85; E.lightMat.emissiveIntensity = night > 0.25 ? 4.5 : 0;
    if (interior) return;
    const member = G.state.boy >= 0;
    if (d < 190 && !E.guards && G.running) spawnGuards(); else if (d > 270 && E.guards) { for (const g of E.guards) if (!g.removed) g.remove(); E.guards = null; }
    // sliding gate with a proximity sensor (opens for Boys Club members)
    let want = member && Math.hypot(px - E.gatePos.x, pz - E.gatePos.z) < 13 && !pl.dead;
    if (!want && G.net && G.net.active) for (const r of G.net.remotes.values()) if (r.boy >= 0 && !r.int && Math.hypot(r.x - E.gatePos.x, r.z - E.gatePos.z) < 13) { want = true; break; }
    if (want !== E.gateWant) { E.gateWant = want; if (G.audio && d < 60) G.audio.gate(); }
    if ((want && E.gateOpen < 1) || (!want && E.gateOpen > 0)) { E.gateOpen = G.clamp(E.gateOpen + (want ? 1 : -1) * dt * 0.45, 0, 1); placeGate(); }
    // trespassers
    if (E.guards) { const inside = E.contains(px, pz, -0.6); if (!member && inside && !pl.dead) { if (!E.alarm) { E.alarm = true; G.ui.subtitle('Guard: Private property! Hands where we can see them!'); G.ui.notify('You are trespassing in a guarded villa', '#e5484d'); } for (const g of E.guards) if (!g.dead) { g.hostile = true; g.lsx = px; g.lsz = pz; } } else if (E.alarm && d > 80) { E.alarm = false; for (const g of E.guards) g.hostile = false; } if (member && d > 120) for (const g of E.guards) g.hostile = false; }
    catUpdate(dt, pl, d < 130);
  };
})();
