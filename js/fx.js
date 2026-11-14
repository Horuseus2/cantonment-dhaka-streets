'use strict';
// Particles, tracers, muzzle flashes, explosions.
(function () {
  const G = window.G;
  const F = G.fx = { parts: [], tracers: [], shake: 0 };
  F.init = function (scene) {
    F.group = new THREE.Group(); scene.add(F.group); const T = G.T;
    for (let i = 0; i < 240; i++) { const add = i < 110; const m = new THREE.SpriteMaterial({ map: T.soft, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, fog: !add }); const s = new THREE.Sprite(m); s.visible = false; F.group.add(s); F.parts.push({ s, m, add, life: 0 }); }
    for (let i = 0; i < 28; i++) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3)); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); l.frustumCulled = false; l.visible = false; F.group.add(l); F.tracers.push({ l, life: 0 }); }
    F.light = new THREE.PointLight(0xffc070, 0, 30, 2); F.group.add(F.light); F.lightT = 0;
  };
  F.setScene = function (scene) { scene.add(F.group); for (const p of F.parts) { p.life = 0; p.s.visible = false; } };
  function spawn(add, x, y, z, vx, vy, vz, life, s0, s1, r, g, b, a, grav, drag) {
    let best = null; for (const p of F.parts) { if (p.add !== add) continue; if (p.life <= 0) { best = p; break; } if (!best || p.life / p.max < best.life / best.max) best = p; }
    if (!best) return; const p = best; p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.life = p.max = life; p.s0 = s0; p.s1 = s1; p.a = a; p.grav = grav || 0; p.drag = drag || 0; p.m.color.setRGB(r, g, b); p.s.visible = true; p.s.position.set(x, y, z); p.s.scale.setScalar(s0); p.m.opacity = a; p.m.rotation = Math.random() * 6.28;
  }
  const R = (a, b) => a + Math.random() * (b - a);
  F.smoke = (x, y, z, gray) => spawn(false, x + R(-0.2, 0.2), y, z + R(-0.2, 0.2), R(-0.4, 0.4) + G.env.windX * 0.6, R(1.2, 2.2), R(-0.4, 0.4), R(1.6, 2.8), 0.5, R(2.2, 3.6), gray, gray, gray, 0.5, 0, 0.3);
  F.fire = (x, y, z) => { spawn(true, x + R(-0.4, 0.4), y, z + R(-0.4, 0.4), R(-0.3, 0.3), R(1.5, 3), R(-0.3, 0.3), R(0.4, 0.8), R(0.8, 1.4), 0.2, 1, R(0.35, 0.6), 0.08, 0.9, 0, 0); if (Math.random() < 0.4) F.smoke(x, y + 0.8, z, 0.08); };
  F.sparks = (x, y, z, n) => { for (let i = 0; i < n; i++) spawn(true, x, y, z, R(-4, 4), R(1, 5), R(-4, 4), R(0.2, 0.5), 0.12, 0.03, 1, 0.8, 0.4, 1, -14, 0); };
  F.dust = (x, y, z, n, r, g, b) => { for (let i = 0; i < n; i++) spawn(false, x, y, z, R(-1, 1), R(0.3, 1.6), R(-1, 1), R(0.5, 1.1), 0.15, R(0.7, 1.3), r, g, b, 0.55, -1, 1.5); };
  F.blood = (x, y, z) => { for (let i = 0; i < 5; i++) spawn(false, x, y, z, R(-1.2, 1.2), R(0.2, 1.8), R(-1.2, 1.2), R(0.3, 0.6), 0.08, 0.3, 0.45, 0.02, 0.02, 0.85, -7, 0.5); };
  F.splash = (x, y, z) => { for (let i = 0; i < 6; i++) spawn(false, x, y, z, R(-2, 2), R(2, 5), R(-2, 2), R(0.4, 0.8), 0.2, 0.7, 0.75, 0.82, 0.85, 0.5, -12, 0.5); };
  F.tyre = (x, y, z) => spawn(false, x, y, z, R(-0.5, 0.5), R(0.3, 0.9), R(-0.5, 0.5), R(0.6, 1.2), 0.4, R(1.4, 2.2), 0.8, 0.8, 0.8, 0.3, 0, 1);
  F.muzzle = function (x, y, z, dx, dy, dz, big) { spawn(true, x + dx * 0.15, y + dy * 0.15, z + dz * 0.15, dx * 2, dy * 2, dz * 2, 0.06, big ? 0.9 : 0.5, big ? 1.3 : 0.75, 1, 0.82, 0.45, 1, 0, 0); F.light.position.set(x, y, z); F.light.color.setRGB(1, 0.75, 0.42); F.light.intensity = big ? 6 : 3.5; F.light.distance = 22; F.lightT = 0.06; };
  F.tracer = function (ax, ay, az, bx, by, bz) { let t = F.tracers.find(q => q.life <= 0) || F.tracers[0]; const p = t.l.geometry.attributes.position; p.setXYZ(0, ax, ay, az); p.setXYZ(1, bx, by, bz); p.needsUpdate = true; t.l.visible = true; t.life = 0.07; t.l.material.opacity = 0.85; };
  F.explosion = function (x, y, z, scale, source) {
    scale = scale || 1;
    for (let i = 0; i < 16; i++) spawn(true, x + R(-1, 1), y + R(0, 1), z + R(-1, 1), R(-5, 5) * scale, R(1, 8) * scale, R(-5, 5) * scale, R(0.5, 1.1), 1.5 * scale, 4.5 * scale, 1, R(0.4, 0.7), 0.1, 1, 0, 2);
    for (let i = 0; i < 12; i++) spawn(false, x + R(-1.5, 1.5), y + R(0, 1.5), z + R(-1.5, 1.5), R(-3, 3), R(2, 6), R(-3, 3), R(1.8, 3.5), 2 * scale, 7 * scale, 0.1, 0.1, 0.1, 0.7, 0, 0.6);
    F.sparks(x, y + 0.5, z, 14);
    F.light.position.set(x, y + 1.5, z); F.light.color.setRGB(1, 0.6, 0.25); F.light.intensity = 30; F.light.distance = 70; F.lightT = 0.35;
    if (G.game && G.game.onExplosion) G.game.onExplosion(x, y, z, 9 * scale, source);
  };
  F.update = function (dt) {
    for (const p of F.parts) { if (p.life <= 0) continue; p.life -= dt; if (p.life <= 0) { p.s.visible = false; continue; } const k = 1 - p.life / p.max; p.vy += p.grav * dt; if (p.drag) { const d = Math.exp(-p.drag * dt); p.vx *= d; p.vz *= d; if (p.grav === 0) p.vy *= Math.exp(-p.drag * 0.3 * dt); } p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.y < 0.03 && p.grav < 0) { p.y = 0.03; p.vy *= -0.3; } p.s.position.set(p.x, p.y, p.z); p.s.scale.setScalar(p.s0 + (p.s1 - p.s0) * k); p.m.opacity = p.a * (1 - k * k); }
    for (const t of F.tracers) { if (t.life <= 0) continue; t.life -= dt; t.l.material.opacity = Math.max(0, t.life / 0.07) * 0.85; if (t.life <= 0) t.l.visible = false; }
    if (F.lightT > 0) { F.lightT -= dt; if (F.lightT <= 0) F.light.intensity = 0; else F.light.intensity *= Math.exp(-dt * 10); }
    F.shake = Math.max(0, F.shake - dt * 2.2);
  };
})();
