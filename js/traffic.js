'use strict';
// Traffic AI (left-hand driving), spawning, parked cars, bus routes, hired rides, police pursuit driving.
(function () {
  const G = window.G, W = G.world, V = G.Veh;
  const T = G.traffic = { target: 22, routes: [], parked: 0, density: 1 };
  const tmp = {}, TYPEW = [10, 10, 9, 8, 7, 4, 1.1, 0.35, 6];
  const pickW = (list) => { let s = 0; for (const e of list) s += e[1]; let r = Math.random() * s; for (const e of list) { r -= e[1]; if (r <= 0) return e[0]; } return list[0][0]; };

  function pickNext(node, from, a, v) {
    if (a.route) { const R = a.route; if (R.i + 2 < R.nodes.length) return R.nodes[R.i + 2]; if (R.loop) return R.nodes[(R.i + 2) % R.nodes.length]; return -1; }
    const e = W.adjD[node]; if (!e) return from; let tot = 0; const c = [];
    const heavy = v.def.kind === 'bus' || v.def.kind === 'truck', slow = v.def.kind === 'rickshaw';
    for (let i = 0; i < e.length; i += 3) { const to = e[i]; if (to === from) continue; const rd = W.roads[e[i + 2]]; let w = TYPEW[rd.t] || 1; if (heavy && rd.t > 5) w = 0.02; if (slow && (rd.t <= 2 || rd.elev)) w = 0.02; if (slow && rd.t >= 5) w = 8; if (!W.adjD[to]) w *= 0.05; c.push(to, w); tot += w; }
    if (!c.length) return from; let r = Math.random() * tot; for (let i = 0; i < c.length; i += 2) { r -= c[i + 1]; if (r <= 0) return c[i]; } return c[0];
  }
  function roadBetween(a, b) { const e = W.adjD[a]; if (e) for (let i = 0; i < e.length; i += 3) if (e[i] === b) return e[i + 2]; const e2 = W.adjD[b]; if (e2) for (let i = 0; i < e2.length; i += 3) if (e2[i] === a) return e2[i + 2]; return -1; }
  function laneFor(rd, v, a) { if (a.chase) return 0; const w = rd.w; if (rd.o) return a.laneK * w * 0.24; return Math.max(Math.min(w / 4, 2.6), Math.min(w / 2 - v.def.W / 2 - 0.2, 1.0)) + (v.def.kind === 'rickshaw' || v.def.kind === 'cng' ? Math.min(0.8, w * 0.08) : 0); }
  T.setAI = function (v, prev, next, opt) {
    const a = v.ai = Object.assign({ prev, next, nn: -1, laneK: [-1, 0, 1][(Math.random() * 3) | 0], speedK: 0.82 + Math.random() * 0.3, stuck: 0, rev: 0, honk: 2 + Math.random() * 8, driver: true, panic: 0 }, opt || {});
    a.road = roadBetween(prev, next); a.nn = pickNext(next, prev, a, v); v.ctl = v.ctl || { throttle: 0, steer: 0, handbrake: false, braking: false }; v.sleep = false; return a;
  };
  function advance(v) { const a = v.ai; if (a.route) a.route.i++; if (a.nn < 0 || a.nn === undefined) { a.done = true; return; } a.prev = a.next; a.next = a.nn; a.road = roadBetween(a.prev, a.next); a.nn = pickNext(a.next, a.prev, a, v); }

  T.drive = function (v, dt) {
    const a = v.ai, c = v.ctl, pl = G.player; if (!a.driver) { c.throttle = 0; c.steer = 0; c.handbrake = false; return; }
    if (a.chase) chaseTarget(v, a, dt);
    if (a.done) { c.throttle = v.speed > 0.4 ? -1 : 0; c.steer = 0; c.handbrake = true; return; }
    const px = W.nx[a.prev], pz = W.nz[a.prev], qx = W.nx[a.next], qz = W.nz[a.next]; let dx = qx - px, dz = qz - pz; const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
    const s = (v.x - px) * dx + (v.z - pz) * dz, rd = W.roads[a.road] || W.roads[0], lane = laneFor(rd, v, a), off = (v.x - px) * dz - (v.z - pz) * dx;
    if (s > len - Math.max(3, rd.w * 0.45)) { advance(v); return; }
    if (Math.abs(off) > 16 || s < -25) { // lost: snap back to the nearest road
      const nr = W.nearestRoad(v.x, v.z, 60, 7, 0, tmp); if (nr) { const r2 = W.roads[nr.ri], A = r2.k[nr.i], B = r2.k[nr.i + 1], fwd = (W.nx[B] - W.nx[A]) * v.fx + (W.nz[B] - W.nz[A]) * v.fz > 0 || r2.o; a.prev = fwd ? A : B; a.next = fwd ? B : A; a.road = nr.ri; if (!a.route) a.nn = pickNext(a.next, a.prev, a, v); return; } }
    // look-ahead target with lane offset (left of travel direction)
    const sp = Math.abs(v.speed), look = 4.5 + sp * 0.75; let ts = Math.max(s, 0) + look, tx, tz, ang = 0;
    if (ts > len && a.nn >= 0) { let ex = W.nx[a.nn] - qx, ez = W.nz[a.nn] - qz; const l2 = Math.hypot(ex, ez) || 1; ex /= l2; ez /= l2; const r2 = W.roads[roadBetween(a.next, a.nn)] || rd, ln2 = laneFor(r2, v, a), t2 = Math.min(ts - len, l2); tx = qx + ex * t2 + ez * ln2; tz = qz + ez * t2 - ex * ln2; ang = Math.acos(G.clamp(dx * ex + dz * ez, -1, 1)); }
    else { ts = Math.min(ts, len); tx = px + dx * ts + dz * lane; tz = pz + dz * ts - dx * lane; if (a.nn >= 0) { let ex = W.nx[a.nn] - qx, ez = W.nz[a.nn] - qz; const l2 = Math.hypot(ex, ez) || 1; ang = Math.acos(G.clamp((dx * ex + dz * ez) / l2, -1, 1)); } }
    if (a.pull) { tx += dz * a.pull; tz -= dx * a.pull; }
    const err = G.wrapPi(Math.atan2(tx - v.x, tz - v.z) - v.h); c.steer = G.clamp(err * 2.3, -1, 1);
    let vlim = Math.min(v.def.max * 0.9, W.SPEED[rd.t] * a.speedK * (a.panic > 0 ? 1.5 : 1) * (a.chase ? 1.7 : 1));
    const dn = len - s; if (ang > 0.3 && dn < 10 + sp * 1.4) vlim = Math.min(vlim, Math.max(2.6, 10 - ang * 5.5) + dn * 0.25);
    vlim = Math.min(vlim, Math.max(2.2, 13 - Math.abs(err) * 16));
    if (a.panic > 0) a.panic -= dt;
    // traffic signals
    if (!a.chase && a.panic <= 0 && W.signalNodes.has(a.next) && dn < 28 && dn > 5) { const st = Math.abs(dx) > Math.abs(dz) ? G.props.sigA : G.props.sigB; if (st === 0 || (st === 1 && dn > 11)) { vlim = Math.min(vlim, Math.max(0, dn - 8) * 0.55); a.waitSig = true; } }
    // obstacles ahead
    let blocked = false; const fx = v.fx, fz = v.fz, reach = 7 + sp * 1.5, hw = v.def.W / 2;
    const chk = (ox, oz, orad, ospd) => { const rx = ox - v.x, rz = oz - v.z, ah = rx * fx + rz * fz; if (ah <= 0 || ah > reach + orad) return; const sd = Math.abs(rx * fz - rz * fx); if (sd > hw + orad * 0.75 + 0.25) return; const gap = ah - v.def.L / 2 - orad; const lim = Math.max(0, ospd) + Math.max(0, gap - 1.6) * 0.9; if (lim < vlim) { vlim = lim; if (gap < 4) blocked = true; } };
    if (!a.chase) { for (const o of V.list) { if (o === v || Math.abs(o.x - v.x) > 40 || Math.abs(o.z - v.z) > 40 || Math.abs(o.y - v.y) > 2) continue; chk(o.x, o.z, Math.min(o.def.L / 2, 2.2), o.vx * fx + o.vz * fz); if (o.def.L > 6) { chk(o.x + o.fx * o.def.L * 0.35, o.z + o.fz * o.def.L * 0.35, 1.3, o.vx * fx + o.vz * fz); chk(o.x - o.fx * o.def.L * 0.35, o.z - o.fz * o.def.L * 0.35, 1.3, o.vx * fx + o.vz * fz); } }
      if (pl && !pl.vehicle && pl.mode === 'foot') chk(pl.pos.x, pl.pos.z, 0.5, 0);
      if (G.npc && v.near < 120) for (const n of G.npc.list) { if (n.dead || n.inVeh || Math.abs(n.x - v.x) > 25 || Math.abs(n.z - v.z) > 25) continue; chk(n.x, n.z, 0.35, 0); } }
    // bus stops
    if (a.bus) { const B = a.bus, st = B.stops[B.si % B.stops.length]; if (st) { const d = Math.hypot(st.rx - v.x, st.rz - v.z); if (B.dwell > 0) { vlim = 0; B.dwell -= dt; B.atStop = st; if (B.dwell <= 0) { B.si++; B.atStop = null; a.pull = 0; } } else if (d < 34 && !B.skip) { a.pull = Math.min(1.6, (34 - d) * 0.1); vlim = Math.min(vlim, Math.max(0, d - 7) * 0.5 + 0.4); if (d < 9 || (d < 16 && sp < 0.3)) { if (sp < 0.5) B.dwell = 8; else vlim = 0; } } } }
    if (a.hold > 0) { a.hold -= dt; vlim = 0; }
    if (a.rev > 0) { a.rev -= dt; c.throttle = -0.7; c.steer = -c.steer; c.handbrake = false; return; }
    const e = vlim - v.speed; c.throttle = G.clamp(e * 0.9, -1, 1); c.braking = e < -1; c.handbrake = vlim < 0.2 && sp < 0.6; if (c.handbrake) c.throttle = 0;
    if (sp < 0.4 && !(a.bus && a.bus.dwell > 0) && !a.waitSig && !a.hold) { a.stuck += dt; if (blocked) { a.honk -= dt; if (a.honk <= 0) { a.honk = 3 + Math.random() * 9; if (G.audio && v.near < 60) G.audio.horn(v.near, v.def.kind); } } if (a.stuck > 16 && !a.bus) { a.rev = 1.3; a.stuck = 8; } } else a.stuck = Math.max(0, a.stuck - dt * 2);
    a.waitSig = false;
  };
  function chaseTarget(v, a, dt) { // police pursuit: follow roads toward the player, then go direct
    const pl = G.player, tx = pl.pos.x, tz = pl.pos.z, d = Math.hypot(tx - v.x, tz - v.z); a.done = false; a.replan = (a.replan || 0) - dt;
    if (d < 38 && Math.abs(pl.pos.y - v.y) < 3) { const c = v.ctl, err = G.wrapPi(Math.atan2(tx - v.x, tz - v.z) - v.h); c.steer = G.clamp(err * 2.5, -1, 1); const onFoot = !pl.vehicle; const want = onFoot ? (d < 11 ? 0 : 8) : Math.min(v.def.max, Math.abs(pl.vehicle.speed) + 9); c.throttle = G.clamp((want - v.speed) * 0.8, -1, 1); c.handbrake = want === 0 && Math.abs(v.speed) < 1; c.braking = false; a.done = true; a.direct = true; a.arrived = onFoot && d < 13 && Math.abs(v.speed) < 2; if (Math.abs(v.speed) < 0.5 && !a.arrived) { a.stuck += dt; if (a.stuck > 2.5) { a.rev = 1.2; a.stuck = 0; } } if (a.rev > 0) { a.rev -= dt; c.throttle = -0.8; c.steer = -c.steer; } return; }
    a.direct = false; a.arrived = false;
    if (a.replan <= 0 || !a.route) { a.replan = 2.5; const from = W.nearestNode(v.x, v.z, true), to = W.nearestNode(tx, tz, true), p = W.findPath(from, to); if (p && p.length > 1) { a.route = { nodes: p, i: 0 }; a.prev = p[0]; a.next = p[1]; a.road = roadBetween(a.prev, a.next); a.nn = p[2] !== undefined ? p[2] : -1; const s = (v.x - W.nx[a.prev]) * (W.nx[a.next] - W.nx[a.prev]) + (v.z - W.nz[a.prev]) * (W.nz[a.next] - W.nz[a.prev]); if (s > 0 && p.length > 2 && Math.hypot(W.nx[a.prev] - v.x, W.nz[a.prev] - v.z) > Math.hypot(W.nx[a.next] - W.nx[a.prev], W.nz[a.next] - W.nz[a.prev])) advance(v); } }
  }

  // ---------- spawning ----------
  function typeFor(rd, cantt, night) {
    if (rd.t <= 4) return pickW([['sedan', 22], ['hatch', 12], ['suv', 10], ['taxi', 4], ['cng', cantt ? 3 : 17], ['van', 6], ['pickup', 5], ['truck', night ? 9 : 2], ['bike', 12], ['mpjeep', cantt ? 9 : 0.3], ['sports', 1.2], ['ambulance', 0.7], ['sportbike', 1.5], ['police', cantt ? 0 : 1.3]]);
    if (rd.t === 5 || rd.t === 8) return pickW([['sedan', 14], ['hatch', 10], ['cng', cantt ? 2 : 14], ['rickshaw', cantt ? 2 : 24], ['bike', 14], ['van', 4], ['suv', 6], ['pickup', 3], ['mpjeep', cantt ? 6 : 0]]);
    return pickW([['rickshaw', cantt ? 3 : 30], ['bike', 18], ['cng', cantt ? 2 : 10], ['sedan', 8], ['hatch', 8], ['suv', cantt ? 6 : 1]]);
  }
  T.clearSpot = function (x, z, r) { for (const o of V.list) if (Math.hypot(o.x - x, o.z - z) < r + o.R) return false; return true; };
  T.spawnOnRoad = function (x, z, id, opt) { // place a vehicle on the nearest road, facing along it
    const nr = W.nearestRoad(x, z, 80, 7, 0, {}); if (!nr) return null; const rd = W.roads[nr.ri]; let A = rd.k[nr.i], B = rd.k[nr.i + 1]; opt = opt || {};
    if (!rd.o && opt.flip) { const q = A; A = B; B = q; } const dx = W.nx[B] - W.nx[A], dz = W.nz[B] - W.nz[A], l = Math.hypot(dx, dz) || 1, lane = opt.parked ? rd.w / 2 - V.DEFS[id].W / 2 + 0.25 : Math.min(rd.w / 4, 2.4);
    const v = V.create(id, nr.x + dz / l * lane, nr.z - dx / l * lane, Math.atan2(dx, dz), { y: nr.y, color: opt.color }); v.gy = nr.y; v.sync(); v.nodeA = A; v.nodeB = B; return v;
  };
  function spawnTraffic(px, pz) {
    const ang = Math.random() * 6.283, dist = 95 + Math.random() * 115, x = px + Math.cos(ang) * dist, z = pz + Math.sin(ang) * dist;
    const nr = W.nearestRoad(x, z, 50, 7, 0, tmp); if (!nr) return; const rd = W.roads[nr.ri]; if (rd.t >= 6 && Math.random() < 0.55) return;
    const cam = G.cam, ddx = nr.x - cam.pos.x, ddz = nr.z - cam.pos.z, dd = Math.hypot(ddx, ddz); if (dd < 70) return; if (dd < 150 && (ddx * cam.dir.x + ddz * cam.dir.z) / dd > 0.55 && W.los(cam.pos.x, cam.pos.y, cam.pos.z, nr.x, nr.y + 1.2, nr.z)) return;
    if (!T.clearSpot(nr.x, nr.z, 9)) return;
    const cantt = W.inCantt(nr.x, nr.z), night = G.env.night > 0.5, parked = T.parked < 9 && rd.t >= 4 && rd.t <= 6 && !rd.elev && Math.random() < 0.3;
    const id = parked ? pickW([['sedan', 10], ['hatch', 8], ['suv', 5], ['bike', 6], ['van', 3], ['pickup', 3], ['sports', 0.8], ['cng', 2], ['sportbike', 1]]) : typeFor(rd, cantt, night);
    const v = T.spawnOnRoad(nr.x, nr.z, id, { flip: Math.random() < 0.5, parked }); if (!v) return;
    if (parked) { if (W.buildingAt(v.x, v.z) >= 0) { v.remove(); return; } v.parked = true; T.parked++; return; }
    const a = T.setAI(v, v.nodeA, v.nodeB); const sp = W.SPEED[rd.t] * 0.6; v.vx = v.fx * sp; v.vz = v.fz * sp; v.speed = sp; if (G.env.night > 0.35 || G.env.rain > 0.3) v.setLights(true);
    a.kind = id === 'mpjeep' ? 'soldier' : id === 'police' ? 'police' : id === 'rickshaw' ? 'worker' : 'civ';
  }
  // ---------- bus routes ----------
  T.initRoutes = function () {
    const find = n => W.stops.find(s => s.n.toLowerCase().includes(n));
    const defs = [['Airport Road Line', '#c0392b', ['jahangir gate', 'mohakhali', 'chairman bari', 'shainik club', 'kakoli', 'navy mor', 'staff road', 'mes', 'shaheen college']], ['Cantonment Line', '#1e8449', ['mirpur 14', 'kochukhet', 'adamjee', 'post office', 'garrison', 'staff road']], ['ECB Line', '#1f5fa8', ['ecb', 'manikdi', 'baganbari', 'air headquarter', 'zia colony']]];
    for (const [name, color, names] of defs) {
      const stops = names.map(find).filter(Boolean); if (stops.length < 2) continue; const seq = stops.concat(stops.slice(1, -1).reverse()); let nodes = [], ok = [];
      for (let i = 0; i < seq.length; i++) { const a = W.nearestNode(seq[i].rx, seq[i].rz, true), b = W.nearestNode(seq[(i + 1) % seq.length].rx, seq[(i + 1) % seq.length].rz, true), p = W.findPath(a, b); if (!p || p.length < 2) continue; if (nodes.length && nodes[nodes.length - 1] === p[0]) p.shift(); nodes = nodes.concat(p); ok.push(seq[i]); }
      if (nodes.length > 4 && ok.length > 1) { if (nodes[0] === nodes[nodes.length - 1]) nodes.pop(); T.routes.push({ name, color, stops: ok, nodes, uniq: stops }); for (const s of stops) (s.routes || (s.routes = [])).push(T.routes.length - 1); }
    }
  };
  T.spawnBus = function (ri, nearX, nearZ, minD, maxD, towardStop) {
    const R = T.routes[ri]; if (!R) return null; let best = -1, bd = 1e9;
    if (towardStop) { let si = -1, sd = 1e9; R.nodes.forEach((n, i) => { const d = Math.hypot(W.nx[n] - towardStop.rx, W.nz[n] - towardStop.rz); if (d < sd) { sd = d; si = i; } }); let acc = 0, i = si; while (acc < minD) { const j = (i - 1 + R.nodes.length) % R.nodes.length; acc += Math.hypot(W.nx[R.nodes[i]] - W.nx[R.nodes[j]], W.nz[R.nodes[i]] - W.nz[R.nodes[j]]); i = j; if (i === si) break; } best = i; }
    else R.nodes.forEach((n, i) => { const d = Math.hypot(W.nx[n] - nearX, W.nz[n] - nearZ); if (d > minD && d < maxD && Math.abs(d - (minD + maxD) / 2) < bd && T.clearSpot(W.nx[n], W.nz[n], 12)) { bd = Math.abs(d - (minD + maxD) / 2); best = i; } });
    if (best < 0) return null; const A = R.nodes[best], B = R.nodes[(best + 1) % R.nodes.length]; if (!T.clearSpot(W.nx[A], W.nz[A], 8)) return null;
    const dx = W.nx[B] - W.nx[A], dz = W.nz[B] - W.nz[A], l = Math.hypot(dx, dz) || 1; const v = V.create('bus', W.nx[A] + dz / l * 2, W.nz[A] - dx / l * 2, Math.atan2(dx, dz), { y: W.nh[A], color: R.color }); v.gy = W.nh[A];
    // next stop index: first stop ahead on the route
    let si = 0, bestAhead = 1e9; R.stops.forEach((s, k) => { let idx = -1, sd = 1e9; R.nodes.forEach((n, i) => { const d = Math.hypot(W.nx[n] - s.rx, W.nz[n] - s.rz); if (d < sd) { sd = d; idx = i; } }); const ahead = (idx - best + R.nodes.length) % R.nodes.length; if (ahead > 0 && ahead < bestAhead) { bestAhead = ahead; si = k; } });
    T.setAI(v, A, B, { route: { nodes: R.nodes, i: best, loop: true }, bus: { ri, stops: R.stops, si, dwell: 0 }, speedK: 0.8, laneK: -1, kind: 'civ' }); v.isBus = true; v.routeName = R.name; if (G.env.night > 0.35) v.setLights(true); return v;
  };
  T.callBus = function (stop) { if (!stop.routes) return null; for (const ri of stop.routes) { const ex = V.list.find(v => v.isBus && v.ai && v.ai.bus.ri === ri && Math.hypot(v.x - stop.rx, v.z - stop.rz) < 320); if (ex) return ex; } return T.spawnBus(stop.routes[0], stop.rx, stop.rz, 150, 0, stop); };
  // hired ride (CNG / taxi / rickshaw) to a destination node
  T.hire = function (v, tx, tz) { const from = v.ai.next, to = W.nearestNode(tx, tz, true), p = W.findPath(from, to); if (!p || p.length < 2) return false; const a = v.ai; a.route = { nodes: [a.prev].concat(p), i: 0 }; a.nn = p[1] !== undefined ? p[1] : -1; a.done = false; a.hired = true; a.speedK = 1.15; return true; };
  T.release = function (v) { const a = v.ai; if (!a) return; a.route = null; a.hired = false; a.done = false; a.speedK = 0.9; a.nn = pickNext(a.next, a.prev, a, v); };
  T.killDriver = function (v, src) { if (!v.ai || !v.ai.driver) return; v.ai.driver = false; if (v.driverChar) v.driverPose = 'dead'; if (src === 'player' && G.wanted) G.wanted.crime('kill', v.x, v.z); if (G.audio && v.near < 70) G.audio.horn(v.near, 'stuck'); };
  T.panic = function (x, z, r) { for (const v of V.list) { if (!v.ai || !v.ai.driver || v.ai.chase) continue; if (Math.hypot(v.x - x, v.z - z) < r) v.ai.panic = 6; } };

  let spawnT = 0;
  T.update = function (dt, px, pz) {
    const hour = G.env.time, den = (hour < 5 ? 0.3 : hour < 7 ? 0.6 : hour < 10 ? 1.15 : hour < 16 ? 1 : hour < 20 ? 1.2 : hour < 23 ? 0.7 : 0.4) * T.density;
    let moving = 0; V.sirenAny = false;
    for (let i = V.list.length - 1; i >= 0; i--) {
      const v = V.list[i]; v.near = Math.hypot(v.x - px, v.z - pz);
      if (v.siren && !v.dead) V.sirenAny = true;
      if (v.ai && !v.isBus && !v.keep) moving++;
      if (v.dead) { v.wreckT -= dt; if (v.wreckT <= 0 && v.near > 40 && v.driver !== 'player') { v.remove(); continue; } }
      const far = v.isBus ? 420 : v.ai && v.ai.chase ? 400 : 250;
      if (!v.keep && v.driver !== 'player' && v !== (G.player && G.player.ride) && (v.near > far || (v.ai && v.ai.stuck > 30 && v.near > 55))) { if (v.parked) T.parked--; v.remove(); continue; }
      if (v.parked && !v.sleep) { v.parked = false; T.parked--; }
      // lazily show a driver
      const showD = v.ai && (v.near < (v.geo.pose ? 110 : 55));
      if (showD && !v.driverChar && v.ai.driver !== undefined) { const ch = v.driverChar = new G.Char.Character(G.Char.randomApp(v.ai.kind || 'civ')); v.driverPose = v.ai.driver ? (v.geo.pose || 'drive') : 'dead'; if (v.def.kind === 'bike') { ch.app.hat = 'helmet'; ch.app.hatCol = '#222'; ch.rebuild(); } const s = v.geo.seats[0]; ch.root.position.set(s[0], s[1], s[2]); v.group.add(ch.root); ch.update(1, { pose: v.driverPose }); }
      else if (!showD && v.driverChar && v.driver !== 'player') { v.driverChar.dispose(); v.driverChar = null; }
      if (v.driverChar && v.near < 60) v.driverChar.update(dt, { pose: v.driverPose, steer: v.steer / 0.6, speed: Math.abs(v.speed) });
      if (v.ai) { T.drive(v, dt); v.update(dt, v.ctl); if (v.ai && v.lights !== (G.env.night > 0.35 || G.env.rain > 0.4) && !v.dead) v.setLights(!v.lights); }
      else if (v.driver !== 'player') v.update(dt, null);
    }
    spawnT -= dt; if (spawnT <= 0) { spawnT = 0.12; if (moving < T.target * den && G.player.mode !== 'interior') spawnTraffic(px, pz);
      if (Math.random() < 0.06) for (let ri = 0; ri < T.routes.length; ri++) { const R = T.routes[ri]; if (V.list.some(v => v.isBus && v.ai && v.ai.bus && v.ai.bus.ri === ri)) continue; if (R.nodes.some(n => Math.hypot(W.nx[n] - px, W.nz[n] - pz) < 260)) T.spawnBus(ri, px, pz, 150, 300); } }
    V.collideAll(); V.updateShared(G.time, G.env.night);
  };
})();
