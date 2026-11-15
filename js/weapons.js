'use strict';
// Weapons: detailed procedural gun models, hitscan ballistics, rockets, grenades, melee.
(function () {
  const G = window.G, GB = G.GB, W = G.world, col = G.col;
  const Wp = G.Weapons = { geos: {}, proj: [] };
  const ST = '#2a2c30', DK = '#141516', WD = '#6b4423', PL = '#1d1f22', LT = '#3a3d42';
  Wp.DEFS = {
    fist: { name: 'Fists', type: 'melee', slot: 0, dmg: 14, price: 0 },
    bat: { name: 'Cricket Bat', type: 'melee', slot: 0, dmg: 34, price: 1200 },
    pistol: { name: '9mm Pistol', type: 'pistol', slot: 1, dmg: 24, rpm: 320, mag: 12, spread: 0.012, recoil: 0.014, range: 120, reload: 1.3, price: 18000, ammoPrice: 600, mz: 0.17, my: 0.05, snd: 0 },
    revolver: { name: '.38 Revolver', type: 'pistol', slot: 1, dmg: 52, rpm: 120, mag: 6, spread: 0.01, recoil: 0.035, range: 140, reload: 2.1, price: 32000, ammoPrice: 800, mz: 0.22, my: 0.05, snd: 1 },
    smg: { name: 'Micro SMG', type: 'smg', slot: 2, dmg: 17, rpm: 850, mag: 30, spread: 0.028, recoil: 0.009, range: 110, reload: 1.8, auto: 1, price: 55000, ammoPrice: 1200, mz: 0.26, my: 0.045, snd: 2 },
    ak: { name: 'AK Rifle', type: 'rifle', slot: 3, dmg: 33, rpm: 600, mag: 30, spread: 0.016, recoil: 0.014, range: 260, reload: 2.3, auto: 1, long: 1, price: 140000, ammoPrice: 2200, mz: 0.69, my: 0.04, snd: 3 },
    carbine: { name: 'Service Carbine', type: 'rifle', slot: 3, dmg: 29, rpm: 720, mag: 30, spread: 0.01, recoil: 0.01, range: 280, reload: 2.0, auto: 1, long: 1, price: 185000, ammoPrice: 2400, mz: 0.6, my: 0.04, snd: 3 },
    shotgun: { name: 'Pump Shotgun', type: 'shotgun', slot: 4, dmg: 15, pellets: 9, rpm: 72, mag: 8, spread: 0.07, recoil: 0.05, range: 60, reload: 2.8, long: 1, price: 75000, ammoPrice: 1500, mz: 0.72, my: 0.045, snd: 4 },
    sniper: { name: 'Sniper Rifle', type: 'sniper', slot: 5, dmg: 180, rpm: 42, mag: 5, spread: 0.0008, recoil: 0.06, range: 600, reload: 3.0, long: 1, scope: 1, price: 320000, ammoPrice: 3500, mz: 0.92, my: 0.04, snd: 5 },
    lmg: { name: 'Light Machine Gun', type: 'rifle', slot: 6, dmg: 30, rpm: 760, mag: 100, spread: 0.022, recoil: 0.011, range: 280, reload: 4.2, auto: 1, long: 1, price: 420000, ammoPrice: 6000, mz: 0.8, my: 0.04, snd: 3 },
    rpg: { name: 'RPG', type: 'heavy', slot: 7, dmg: 0, rpm: 30, mag: 1, spread: 0.004, recoil: 0.08, range: 400, reload: 3.2, long: 1, price: 650000, ammoPrice: 15000, mz: 0.6, my: 0.06, snd: 6 },
    grenade: { name: 'Grenade', type: 'thrown', slot: 8, dmg: 0, rpm: 50, mag: 1, range: 40, reload: 0.6, price: 9000, ammoPrice: 9000, snd: 7 }
  };
  Wp.ORDER = ['fist', 'bat', 'pistol', 'revolver', 'smg', 'ak', 'carbine', 'shotgun', 'sniper', 'lmg', 'rpg', 'grenade'];
  for (const id in Wp.DEFS) Wp.DEFS[id].id = id;
  const HP = Math.PI / 2;
  const B = {
    bat(g) { g.cyl(0, 0, 0.1, 0.017, 0.32, col('#2b2b2b'), 8, HP); g.box(0, 0, 0.56, 0.105, 0.04, 0.6, col('#d8c49a')); g.box(0, 0.022, 0.56, 0.05, 0.02, 0.56, col('#cdb88a')); g.cyl(0, 0, -0.07, 0.022, 0.02, col('#111'), 8, HP); },
    pistol(g) { g.box(0, 0.05, 0.05, 0.03, 0.04, 0.2, col(ST)); g.box(0, 0.054, 0.02, 0.031, 0.02, 0.06, col(LT)); g.box(0, 0.022, 0.04, 0.028, 0.022, 0.16, col(DK)); g.box(0, -0.042, -0.028, 0.029, 0.11, 0.05, col(PL), 0, 0.22); g.box(0, 0.076, 0.14, 0.006, 0.012, 0.008, col(DK)); g.box(0, 0.076, -0.04, 0.02, 0.012, 0.008, col(DK)); g.cyl(0, 0.05, 0.156, 0.009, 0.02, col(DK), 8, HP); g.box(0, -0.008, 0.03, 0.006, 0.006, 0.06, col(DK)); g.box(0, -0.02, 0.058, 0.006, 0.03, 0.006, col(DK)); g.box(0, 0.0, 0.034, 0.005, 0.024, 0.007, col(LT)); g.box(0, -0.095, -0.04, 0.03, 0.012, 0.052, col(DK), 0, 0.22); },
    revolver(g) { g.cyl(0, 0.045, 0.03, 0.03, 0.05, col(LT), 10, HP); g.cyl(0, 0.055, 0.15, 0.012, 0.19, col(ST), 8, HP); g.box(0, 0.035, 0.14, 0.01, 0.02, 0.17, col(ST)); g.box(0, 0.045, 0.02, 0.026, 0.07, 0.11, col(ST)); g.box(0, -0.04, -0.05, 0.03, 0.11, 0.045, col(WD), 0, 0.35); g.box(0, 0.085, -0.04, 0.008, 0.02, 0.02, col(DK)); g.box(0, 0.078, 0.235, 0.006, 0.014, 0.01, col(DK)); g.box(0, -0.005, 0.03, 0.006, 0.006, 0.06, col(ST)); g.box(0, 0.0, 0.03, 0.005, 0.024, 0.007, col(LT)); },
    smg(g) { g.box(0, 0.04, 0.03, 0.042, 0.075, 0.26, col(ST)); g.box(0, 0.085, 0.03, 0.02, 0.016, 0.2, col(DK)); g.cyl(0, 0.045, 0.2, 0.012, 0.1, col(DK), 8, HP); g.cyl(0, 0.045, 0.25, 0.018, 0.04, col(DK), 8, HP); g.box(0, -0.05, -0.02, 0.03, 0.1, 0.045, col(PL), 0, 0.15); g.box(0, -0.12, 0.0, 0.026, 0.22, 0.036, col(DK)); g.box(0.03, 0.04, -0.2, 0.008, 0.012, 0.22, col(DK)); g.box(-0.03, 0.04, -0.2, 0.008, 0.012, 0.22, col(DK)); g.box(0, 0.03, -0.31, 0.07, 0.07, 0.012, col(DK)); g.box(0, -0.008, 0.05, 0.006, 0.006, 0.07, col(DK)); },
    ak(g) { g.box(0, 0.03, 0.02, 0.046, 0.076, 0.34, col(ST)); g.box(0, 0.074, 0.0, 0.04, 0.022, 0.27, col(LT)); g.cyl(0, 0.04, 0.44, 0.011, 0.48, col(DK), 8, HP); g.cyl(0, 0.068, 0.3, 0.013, 0.2, col(DK), 8, HP); g.box(0, 0.042, 0.29, 0.05, 0.062, 0.2, col(WD)); g.box(0, 0.088, 0.6, 0.008, 0.05, 0.012, col(DK)); g.box(0, 0.066, 0.6, 0.03, 0.012, 0.014, col(DK)); g.cyl(0, 0.04, 0.67, 0.016, 0.05, col(DK), 8, HP);
      for (let i = 0; i < 4; i++) g.box(0, -0.035 - i * 0.045, 0.085 + i * i * 0.009, 0.03, 0.052, 0.066, col(DK), 0, -0.13 * i); g.box(0, -0.06, -0.1, 0.03, 0.1, 0.045, col(WD), 0, 0.3); g.box(0, 0.02, -0.32, 0.04, 0.078, 0.3, col(WD), 0, -0.08); g.box(0, 0.0, -0.475, 0.042, 0.1, 0.014, col(DK)); g.box(0, 0.092, 0.1, 0.02, 0.014, 0.03, col(DK)); g.box(-0.03, 0.05, 0.02, 0.014, 0.012, 0.03, col(LT)); g.box(0, -0.012, -0.03, 0.006, 0.006, 0.08, col(DK)); },
    carbine(g) { g.box(0, 0.035, 0.0, 0.044, 0.07, 0.28, col(PL)); g.box(0, 0.04, 0.26, 0.052, 0.056, 0.26, col(DK)); for (let i = 0; i < 6; i++) g.box(0, 0.072, 0.16 + i * 0.04, 0.03, 0.008, 0.02, col(LT)); g.cyl(0, 0.04, 0.47, 0.01, 0.22, col(ST), 8, HP); g.cyl(0, 0.04, 0.59, 0.014, 0.04, col(DK), 8, HP); g.box(0, 0.085, 0.38, 0.008, 0.045, 0.012, col(DK));
      g.cyl(0, 0.105, 0.02, 0.022, 0.16, col(DK), 10, HP); g.box(0, 0.082, 0.02, 0.02, 0.02, 0.1, col(DK)); g.box(0, -0.085, 0.07, 0.028, 0.17, 0.06, col(DK), 0, -0.14); g.box(0, -0.055, -0.08, 0.03, 0.1, 0.042, col(PL), 0, 0.28); g.cyl(0, 0.04, -0.25, 0.016, 0.22, col(DK), 8, HP); g.box(0, 0.02, -0.38, 0.04, 0.1, 0.1, col(PL)); g.box(0, -0.012, -0.02, 0.006, 0.006, 0.08, col(DK)); },
    shotgun(g) { g.box(0, 0.035, 0.0, 0.046, 0.07, 0.3, col(ST)); g.cyl(0, 0.05, 0.43, 0.014, 0.58, col(DK), 8, HP); g.cyl(0, 0.018, 0.36, 0.014, 0.44, col(DK), 8, HP); g.box(0, 0.02, 0.32, 0.05, 0.05, 0.18, col(WD)); g.box(0, 0.072, 0.7, 0.006, 0.012, 0.008, col(LT)); g.box(0, 0.0, -0.3, 0.04, 0.08, 0.32, col(WD), 0, -0.12); g.box(0, -0.035, -0.47, 0.042, 0.11, 0.016, col(DK)); g.box(0, -0.012, -0.05, 0.006, 0.006, 0.08, col(DK)); g.box(0.026, 0.045, 0.02, 0.006, 0.03, 0.08, col(LT)); },
    sniper(g) { g.box(0, 0.035, 0.0, 0.044, 0.066, 0.34, col(ST)); g.cyl(0, 0.045, 0.55, 0.012, 0.76, col(DK), 8, HP); g.cyl(0, 0.045, 0.9, 0.019, 0.08, col(DK), 8, HP); g.cyl(0, 0.115, 0.03, 0.026, 0.3, col(DK), 12, HP); g.cyl(0, 0.115, 0.2, 0.033, 0.05, col(DK), 12, HP); g.cyl(0, 0.115, -0.13, 0.03, 0.03, col(DK), 12, HP); g.box(0, 0.085, 0.1, 0.014, 0.03, 0.02, col(DK)); g.box(0, 0.085, -0.05, 0.014, 0.03, 0.02, col(DK));
      g.box(0, 0.01, 0.24, 0.046, 0.05, 0.3, col('#3a4a2e')); g.box(0, 0.0, -0.3, 0.042, 0.1, 0.3, col('#3a4a2e'), 0, -0.06); g.box(0, 0.06, -0.36, 0.036, 0.03, 0.16, col('#2a3a22')); g.box(0, -0.06, -0.1, 0.03, 0.1, 0.042, col('#3a4a2e'), 0, 0.3); g.box(0, -0.045, 0.06, 0.03, 0.08, 0.07, col(DK)); g.box(0.04, 0.05, -0.04, 0.05, 0.012, 0.012, col(LT)); for (const s of [-1, 1]) g.cyl(s * 0.03, -0.03, 0.5, 0.006, 0.22, col(DK), 5, 1.2, 0, s * 0.2); g.box(0, -0.012, -0.03, 0.006, 0.006, 0.08, col(DK)); },
    lmg(g) { g.box(0, 0.035, 0.02, 0.05, 0.085, 0.4, col(ST)); g.cyl(0, 0.045, 0.52, 0.015, 0.6, col(DK), 8, HP); g.box(0, 0.04, 0.34, 0.056, 0.05, 0.22, col(DK)); g.cyl(0, 0.045, 0.79, 0.02, 0.06, col(DK), 8, HP); g.box(0, -0.08, 0.1, 0.12, 0.13, 0.14, col('#3a4a2e')); g.box(0, 0.005, 0.1, 0.08, 0.02, 0.1, col(LT)); g.box(0, 0.11, 0.15, 0.012, 0.03, 0.14, col(DK)); g.box(0, 0.125, 0.15, 0.012, 0.012, 0.2, col(DK));
      g.box(0, -0.06, -0.1, 0.03, 0.1, 0.045, col(PL), 0, 0.3); g.box(0, 0.02, -0.34, 0.042, 0.09, 0.3, col(PL)); for (const s of [-1, 1]) g.cyl(s * 0.07, -0.08, 0.66, 0.007, 0.3, col(DK), 5, 0.25, 0, s * 0.3); g.box(0, 0.09, 0.6, 0.008, 0.04, 0.012, col(DK)); },
    rpg(g) { g.cyl(0, 0.06, 0.05, 0.04, 0.95, col('#4a5a3a'), 12, HP); g.cyl(0, 0.06, -0.5, 0.065, 0.16, col('#3a4a2e'), 12, HP, 0, 0, 0.04); g.box(0, 0.06, 0.25, 0.09, 0.09, 0.22, col(WD)); g.cyl(0, 0.06, 0.66, 0.055, 0.3, col('#5a6b3a'), 12, HP, 0, 0, 0.012); g.cyl(0, 0.06, 0.52, 0.03, 0.08, col(DK), 10, HP); g.box(0, -0.03, 0.0, 0.03, 0.1, 0.045, col(PL), 0, 0.2); g.box(0, -0.03, 0.2, 0.03, 0.09, 0.04, col(PL)); g.box(0.045, 0.12, 0.12, 0.02, 0.06, 0.1, col(DK)); },
    grenade(g) { g.sph(0, 0, 0.05, 0.042, 0.052, 0.042, col('#3a4a2e'), 8); g.cyl(0, 0.05, 0.05, 0.016, 0.03, col(LT), 8); g.box(0.02, 0.04, 0.05, 0.008, 0.06, 0.016, col(LT)); }
  };
  Wp.init = function () {
    Wp.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.55 }); Wp.icons = {};
    for (const id in B) { const g = new GB(); B[id](g); for (let i = 0; i < g.p.length; i++) g.p[i] *= 1.12; Wp.geos[id] = g.build(true);
      const [c, x] = G.cv(160, 64); const sc = id === 'pistol' || id === 'revolver' || id === 'grenade' ? 330 : id === 'smg' ? 220 : 118, oz = id === 'pistol' || id === 'revolver' ? 0.06 : id === 'grenade' ? 0.05 : id === 'smg' ? 0.0 : 0.1, oy = id === 'grenade' ? 0.0 : -0.01;
      for (let t = 0; t < g.i.length; t += 3) { x.beginPath(); for (let k = 0; k < 3; k++) { const v = g.i[t + k], px = 80 + (g.p[v * 3 + 2] / 1.12 - oz) * sc, py = 32 - (g.p[v * 3 + 1] / 1.12 - oy) * sc; if (k) x.lineTo(px, py); else x.moveTo(px, py); } const v = g.i[t], l = Math.round(Math.pow(0.5 + g.c[v * 3] * 2.2, 0.6) * 150); x.fillStyle = `rgb(${l},${l},${l})`; x.fill(); }
      Wp.icons[id] = c.toDataURL(); }
    const [c, x] = G.cv(160, 64); x.font = '44px "Segoe UI Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('✊', 80, 34); Wp.icons.fist = c.toDataURL();
    Wp.rocketGeo = (() => { const g = new GB(); g.cyl(0, 0, 0, 0.05, 0.45, col('#5a6b3a'), 8, HP, 0, 0, 0.01); g.cyl(0, 0, -0.3, 0.03, 0.2, col(DK), 6, HP); return g.build(true); })();
  };
  Wp.mesh = function (id) { if (!Wp.geos[id]) return null; const m = new THREE.Mesh(Wp.geos[id], Wp.mat); m.castShadow = true; return m; };

  // ---------- ray tracing against world, peds, vehicles ----------
  const HIT = { t: 0, type: '', obj: null, part: '', x: 0, y: 0, z: 0 };
  function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) { const mx = ox - cx, my = oy - cy, mz = oz - cz, b = mx * dx + my * dy + mz * dz, c = mx * mx + my * my + mz * mz - r * r; if (c > 0 && b > 0) return -1; const disc = b * b - c; if (disc < 0) return -1; const t = -b - Math.sqrt(disc); return t < 0 ? 0 : t; }
  Wp.trace = function (ox, oy, oz, dx, dy, dz, range, ignoreVeh, ignorePed) {
    let best = W.ray(ox, oy, oz, dx, dy, dz, range); const h = HIT; h.type = best < range ? 'world' : 'none'; h.obj = null; h.wb = W.rayB;
    if (G.npc) for (const p of G.npc.list) { if (p === ignorePed || p.removed || p.hidden) continue; const ex = p.x - ox, ez = p.z - oz, along = ex * dx + ez * dz; if (along < -1 || along > best + 1) continue; const s = p.scale || 1, lying = p.dead || p.down > 0;
      if (lying) { const t = raySphere(ox, oy, oz, dx, dy, dz, p.x, p.y + 0.3, p.z, 0.6); if (t >= 0 && t < best) { best = t; h.type = 'ped'; h.obj = p; h.part = 'body'; } continue; }
      let t = raySphere(ox, oy, oz, dx, dy, dz, p.x, p.y + 1.62 * s, p.z, 0.17); if (t >= 0 && t < best) { best = t; h.type = 'ped'; h.obj = p; h.part = 'head'; }
      t = raySphere(ox, oy, oz, dx, dy, dz, p.x, p.y + 1.2 * s, p.z, 0.3); if (t >= 0 && t < best) { best = t; h.type = 'ped'; h.obj = p; h.part = 'body'; }
      t = raySphere(ox, oy, oz, dx, dy, dz, p.x, p.y + 0.75 * s, p.z, 0.27); if (t >= 0 && t < best) { best = t; h.type = 'ped'; h.obj = p; h.part = 'body'; }
      t = raySphere(ox, oy, oz, dx, dy, dz, p.x, p.y + 0.3 * s, p.z, 0.23); if (t >= 0 && t < best) { best = t; h.type = 'ped'; h.obj = p; h.part = 'leg'; } }
    for (const v of G.Veh.list) { if (v === ignoreVeh) continue; const ex = v.x - ox, ez = v.z - oz, along = ex * dx + ez * dz; if (along < -v.R || along > best + v.R) continue; const c = Math.cos(v.h), s = Math.sin(v.h), d = v.def;
      const lx = (ox - v.x) * c - (oz - v.z) * s, lz = (ox - v.x) * s + (oz - v.z) * c, ly = oy - v.y, ldx = dx * c - dz * s, ldz = dx * s + dz * c;
      let t0 = 0, t1 = best, ok = true; const sl = (o, dd, mn, mx) => { if (Math.abs(dd) < 1e-7) { if (o < mn || o > mx) ok = false; return; } let a = (mn - o) / dd, b = (mx - o) / dd; if (a > b) { const q = a; a = b; b = q; } if (a > t0) t0 = a; if (b < t1) t1 = b; if (t0 > t1) ok = false; };
      sl(lx, ldx, -d.W / 2, d.W / 2); if (ok) sl(ly, dy, 0.15, d.H); if (ok) sl(lz, ldz, -d.L / 2, d.L / 2); if (ok && t0 < best) { best = t0; h.type = 'veh'; h.obj = v; h.part = (ly + dy * t0) > (d.belt || d.H * 0.6) ? 'glass' : 'body'; } }
    h.t = best; h.x = ox + dx * best; h.y = oy + dy * best; h.z = oz + dz * best; return h;
  };
  Wp.impact = function (h, dmg, dx, dy, dz, shooter) {
    const F = G.fx;
    if (h.type === 'ped') { F.blood(h.x, h.y, h.z); h.obj.hit(dmg * (h.part === 'head' ? 3.2 : h.part === 'leg' ? 0.7 : 1), h.part, dx, dz, shooter); }
    else if (h.type === 'veh') { F.sparks(h.x, h.y, h.z, 3); const v = h.obj; v.damage(dmg * 0.9); v.sleep = false; if (h.part === 'glass' && v.ai && v.ai.driver && Math.random() < 0.3) G.traffic.killDriver(v, shooter); if (shooter === 'player' && G.wanted) G.wanted.crime('vehicle', v.x, v.z); if (G.audio) G.audio.ping(Math.hypot(h.x - G.cam.pos.x, h.z - G.cam.pos.z)); }
    else if (h.type === 'world') { if (h.wb === -2) F.dust(h.x, 0.05, h.z, 2, 0.5, 0.47, 0.42); else { F.dust(h.x, h.y, h.z, 2, 0.6, 0.58, 0.54); if (Math.random() < 0.4) F.sparks(h.x, h.y, h.z, 2); } }
  };
  const _v = new THREE.Vector3();
  Wp.muzzle = function (pl, def, out) { const g = pl.ch.gun; if (g && !pl.vehicle) { out.set(0, (def.my || 0) * 1.12, (def.mz || 0.2) * 1.12); g.localToWorld(out); } else out.set(pl.pos.x, pl.pos.y + 1.3, pl.pos.z); return out; };
  Wp.reload = function (pl) { const def = Wp.DEFS[pl.weapon], st = pl.inv[pl.weapon]; if (pl.reloadT > 0 || !def.mag || st.clip >= def.mag || st.ammo <= 0) return; pl.reloadT = def.reload; if (G.audio) G.audio.reload(); };
  Wp.fire = function (pl, def, st) {
    const cam = G.cam, I = G.input; st.clip--; pl.cool = 60 / def.rpm; pl.firedT = 0.5;
    const d = cam.dir, ox = cam.pos.x, oy = cam.pos.y, oz = cam.pos.z; const t0 = Math.max(0, (pl.pos.x - ox) * d.x + (pl.pos.y + 1.4 - oy) * d.y + (pl.pos.z - oz) * d.z);
    const sx = ox + d.x * t0, sy = oy + d.y * t0, sz = oz + d.z * t0, mz = Wp.muzzle(pl, def, _v).clone();
    if (G.audio) G.audio.shot(def.snd, 0);
    if (def.type === 'heavy' || def.type === 'thrown') {
      const aim = Wp.trace(sx, sy, sz, d.x, d.y, d.z, def.range, pl.vehicle, null); let ax = aim.x - mz.x, ay = aim.y - mz.y, az = aim.z - mz.z; const l = Math.hypot(ax, ay, az) || 1; ax /= l; ay /= l; az /= l;
      if (def.type === 'heavy') { const m = new THREE.Mesh(Wp.rocketGeo, Wp.mat); G.scene.add(m); Wp.proj.push({ m, x: mz.x, y: mz.y, z: mz.z, vx: ax * 52, vy: ay * 52, vz: az * 52, life: 6, rocket: 1, src: 'player' }); G.fx.muzzle(mz.x, mz.y, mz.z, d.x, d.y, d.z, true); }
      else { const m = Wp.mesh('grenade'); G.scene.add(m); Wp.proj.push({ m, x: mz.x, y: mz.y, z: mz.z, vx: d.x * 17, vy: d.y * 17 + 5, vz: d.z * 17, life: 2.6, src: 'player' }); }
      cam.kick(def.recoil || 0.02); if (G.wanted && def.type === 'heavy') G.wanted.gunfire(pl.pos.x, pl.pos.z); return;
    }
    const spread = def.spread * (pl.aiming ? 0.5 : 1.25) * (1 + pl.spreadAcc) + (pl.moving ? 0.008 : 0) + (pl.vehicle ? 0.02 : 0);
    const n = def.pellets || 1; let ux = -d.z, uz = d.x; const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul; // right vector
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * spread, ca = Math.cos(a) * r, sa = Math.sin(a) * r;
      let dx = d.x + ux * ca - d.x * d.y * sa, dy = d.y + sa * (1 - d.y * d.y), dz = d.z + uz * ca - d.z * d.y * sa; const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
      const h = Wp.trace(sx, sy, sz, dx, dy, dz, def.range, pl.vehicle, null);
      if (i < 3) G.fx.tracer(mz.x, mz.y, mz.z, h.x, h.y, h.z); if (i === 0 && G.net && G.net.active) G.net.shot(mz, h, def.snd, def.type === 'shotgun' || def.type === 'sniper');
      Wp.impact(h, def.dmg * (1 - 0.4 * h.t / def.range), dx, dy, dz, 'player');
    }
    G.fx.muzzle(mz.x, mz.y, mz.z, d.x, d.y, d.z, def.type === 'shotgun' || def.type === 'sniper');
    cam.kick(def.recoil * (pl.aiming ? 0.7 : 1)); pl.spreadAcc = Math.min(2.2, pl.spreadAcc + 0.28);
    if (G.wanted) G.wanted.gunfire(pl.pos.x, pl.pos.z);
  };
  Wp.playerUpdate = function (dt, pl, canFire) {
    const I = G.input, def = Wp.DEFS[pl.weapon], st = pl.inv[pl.weapon]; pl.cool -= dt; pl.spreadAcc = Math.max(0, pl.spreadAcc - dt * 2.4); pl.firedT = Math.max(0, pl.firedT - dt);
    if (pl.reloadT > 0) { pl.reloadT -= dt; if (pl.reloadT <= 0) { const take = Math.min(def.mag - st.clip, st.ammo); st.clip += take; st.ammo -= take; } return; }
    if (def.type === 'melee') { if (I.mb[0] && pl.punchT <= 0 && canFire && !pl.vehicle) { pl.punchT = 0.42; pl.punchHit = false; if (G.audio) G.audio.whoosh(); } return; }
    const trig = def.auto ? I.mb[0] : I.mhit[0];
    if (trig && pl.cool <= 0 && canFire) { if (st.clip <= 0) { if (st.ammo > 0) Wp.reload(pl); else { if (G.audio) G.audio.click(); pl.cool = 0.3; if (def.type === 'thrown') G.player.selectWeapon('fist'); } } else { Wp.fire(pl, def, st); if (st.clip <= 0 && st.ammo > 0) Wp.reload(pl); } }
    if (I.hit.KeyR) Wp.reload(pl);
  };
  // NPC shooting at a point. returns true when the shot connects
  Wp.npcShoot = function (n, tx, ty, tz, def, acc) {
    const mx = n.x + Math.sin(n.heading) * 0.5, my = n.y + 1.4, mz = n.z + Math.cos(n.heading) * 0.5; let dx = tx - mx, dy = ty - my, dz = tz - mz; const dist = Math.hypot(dx, dy, dz) || 1; dx /= dist; dy /= dist; dz /= dist;
    const cd = Math.hypot(mx - G.cam.pos.x, mz - G.cam.pos.z); if (G.audio) G.audio.shot(def.snd, cd); G.fx.muzzle(mx, my, mz, dx, dy, dz, false);
    const wall = W.ray(mx, my, mz, dx, dy, dz, dist);
    if (wall < dist - 0.3) { G.fx.tracer(mx, my, mz, mx + dx * wall, my + dy * wall, mz + dz * wall); return false; }
    const hit = Math.random() < acc * G.clamp(1.15 - dist / def.range * 1.6, 0.12, 1);
    if (hit) G.fx.tracer(mx, my, mz, tx, ty, tz); else { const o = 0.6 + Math.random() * 1.5, a = Math.random() * 6.28; G.fx.tracer(mx, my, mz, tx + Math.cos(a) * o + dx * 12, ty + Math.sin(a) * o * 0.5 + dy * 12, tz + Math.sin(a) * o + dz * 12); }
    return hit;
  };
  const P = { x: 0, z: 0 };
  Wp.update = function (dt) {
    for (let i = Wp.proj.length - 1; i >= 0; i--) {
      const p = Wp.proj[i]; p.life -= dt; let boom = p.life <= 0; const sp = Math.hypot(p.vx, p.vy, p.vz) || 1;
      if (p.rocket) { const d = W.ray(p.x, p.y, p.z, p.vx / sp, p.vy / sp, p.vz / sp, sp * dt + 0.3); if (d < sp * dt + 0.25) boom = true; if (Math.random() < 0.8) G.fx.smoke(p.x, p.y, p.z, 0.75); }
      else { p.vy -= 16 * dt; if (p.y + p.vy * dt < 0.08) { p.y = 0.08; p.vy = Math.abs(p.vy) * 0.35; p.vx *= 0.6; p.vz *= 0.6; } P.x = p.x + p.vx * dt; P.z = p.z + p.vz * dt; if (W.collide(P, 0.12, p.y, true)) { const vn = p.vx * W.hitNx + p.vz * W.hitNz; p.vx = (p.vx - 2 * vn * W.hitNx) * 0.5; p.vz = (p.vz - 2 * vn * W.hitNz) * 0.5; } p.m.rotation.x += dt * 9; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.m.position.set(p.x, p.y, p.z); if (p.rocket) p.m.lookAt(p.x + p.vx, p.y + p.vy, p.z + p.vz);
      if (!boom && p.rocket) { for (const v of G.Veh.list) if (Math.hypot(v.x - p.x, v.z - p.z) < v.R * 0.8 && Math.abs(p.y - v.y - 0.8) < 1.6) { boom = true; break; } if (G.npc) for (const n of G.npc.list) if (!n.dead && Math.hypot(n.x - p.x, n.z - p.z) < 0.6 && p.y < n.y + 1.9) { boom = true; break; } }
      if (boom) { G.fx.explosion(p.x, Math.max(0.3, p.y), p.z, 1, p.src); if (p.m.parent) p.m.parent.remove(p.m); Wp.proj.splice(i, 1); }
    }
  };
})();
