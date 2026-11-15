'use strict';
// Game flow: new game, save/load, interiors, death, deliveries, missions and jobs.
(function () {
  const G = window.G, W = G.world, pl = G.player, U = G.ui, I = G.interior, N = G.npc, V = G.Veh, T = G.traffic;
  const Gm = G.game = { intPos: { x: 0, z: 0 }, job: null, mission: null, busy: false };
  const fresh = () => ({ name: 'Rafi', app: null, owned: {}, garage: [], robbed: {}, stats: {}, missions: {}, boy: -1 });
  G.state = fresh();
  const KEY = 'ds_save_v1';
  Gm.hasSave = () => { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } };
  Gm.save = function (manual) {
    if (pl.dead || !G.running) return false; if (manual && G.wanted.level > 0) { U.notify('You cannot save while wanted', '#e5484d'); return false; } if (Gm.mission) { if (manual) U.notify('Finish or fail the mission first', '#e5484d'); return false; }
    const ip = pl.mode === 'interior' ? Gm.intPos : pl.pos; G.state.app = Object.assign({}, pl.ch.app);
    const d = { state: G.state, p: { x: ip.x, z: ip.z, h: pl.heading, health: pl.health, armor: pl.armor, money: pl.money, bank: pl.bank, inv: pl.inv, weapon: pl.weapon, medkits: pl.medkits }, env: { time: G.env.time, day: G.env.day, weather: G.env.weather } };
    if (G.state.boy >= 0) { G.boyAuth.putSave(G.state.boy, d, !!manual); return true; }
    try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; }
  };
  function resetWorld() { for (const v of V.list.slice()) v.remove(); for (const p of N.list.slice()) p.remove(); T.parked = 0; G.wanted.level = 0; G.wanted.kills = 0; Gm.mission = null; Gm.job = null; clearMarker(); U.objective(null); U.setWaypoint(null); if (pl.mode === 'interior') { I.clear(); G.activeScene = G.scene; } pl.mode = 'foot'; pl.vehicle = null; pl.ride = null; pl.dead = false; G.timeMul = 1; U.bigText(null); }
  function begin(x, z, h) { pl.teleport(x, z, h); G.cam.yaw = h; G.cam.pitch = -0.1; G.running = true; U.showMainMenu(false); U.showHUD(true); U.weaponChanged(); U.lock(); if (G.audio) G.audio.init(); G.preload(x, z); nextMissionMarker(); if (G.net.pendingRoom) { const room = G.net.pendingRoom; G.net.pendingRoom = null; G.net.join(room).then(r => { if (r.ok) { U.notify('Connected to server "' + r.room + '". ' + r.count + ' of ' + G.net.max + ' players online.', '#58d26b'); U.notify('Press T to chat, hold Z for the player list.'); } else U.notify(r.why, '#e5484d'); }); } }
  const doorOut = (p, d) => ({ x: p.x + Math.sin(p.a) * (d || 1.6), z: p.z + Math.cos(p.a) * (d || 1.6), h: p.a });
  Gm.homePoi = () => G.state.boy >= 0 ? G.boys.house(G.state.boy) : W.pois.find(p => p.c === 'home');
  Gm.newGame = function () {
    if (G.audio) G.audio.init(); resetWorld(); G.state = fresh(); Object.assign(pl, { health: 100, armor: 0, money: 5000, bank: 20000, inv: { fist: { clip: 0, ammo: 0 } }, weapon: 'fist', medkits: 1 }); pl.init(G.Char.defaultApp());
    G.env.time = 8.5; G.env.day = 0; G.env.setWeather('clear', true); U.showMainMenu(false);
    // character creation in a studio room
    I.build({ id: 999001, c: 'studio', n: 'Studio' }); G.activeScene = I.scene; I.scene.add(pl.ch.root); pl.mode = 'interior'; pl.pos.x = 0; pl.pos.y = 0; pl.pos.z = -0.6; pl.heading = 0; U.showHUD(false); G.running = true; const home = Gm.homePoi(), o = doorOut(home); Gm.intPos.x = o.x; Gm.intPos.z = o.z;
    U.openWardrobe('create', 0, () => { Gm.fade(() => { I.clear(); G.activeScene = G.scene; G.scene.add(pl.ch.root); pl.mode = 'foot'; begin(o.x, o.z, o.h); U.notify('Welcome to Dhaka Cantonment, ' + G.state.name + '. Your flat is right behind you.'); U.notify('Press M for the map. Esc shows all controls.'); startMission(0); Gm.save(); }); });
  };
  Gm.quickStart = function () { // debug / test entry: skip character creation
    resetWorld(); G.state = fresh(); G.state.missions = { m1: 1 }; Object.assign(pl, { health: 100, armor: 50, money: 80000, bank: 20000, inv: { fist: { clip: 0, ammo: 0 } }, weapon: 'fist', medkits: 2 }); pl.init(G.Char.defaultApp()); pl.give('pistol', true); pl.give('ak', true); pl.give('shotgun', true); pl.give('rpg', true);
    const home = Gm.homePoi(), o = doorOut(home, 2); begin(o.x, o.z, o.h);
  };
  Gm.continueGame = function () {
    let d; try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) { } if (!d) return Gm.newGame(); resetWorld(); G.state = Object.assign(fresh(), d.state); const p = d.p;
    Object.assign(pl, { health: p.health, armor: p.armor, money: p.money, bank: p.bank, inv: p.inv, weapon: p.weapon, medkits: p.medkits || 0 }); pl.init(G.state.app || G.Char.defaultApp());
    G.env.time = d.env.time; G.env.day = d.env.day; G.env.setWeather(d.env.weather, true); begin(p.x, p.z, p.h); if (G.state.boy >= 0) G.boys.spawnCars(G.state.boy); U.notify('Welcome back, ' + G.state.name);
  };
  Gm.playAsBoy = async function (i) {
    const b = G.BOYS[i]; let d = null; try { d = await G.boyAuth.loadSave(i); } catch (e) { }
    const h = G.boys.house(i); resetWorld(); G.state = fresh(); if (d && d.state) G.state = Object.assign(fresh(), d.state); G.state.boy = i; G.state.name = b.name; if (!G.state.app) G.state.app = Object.assign({}, b.app); G.state.missions.m1 = 1;
    const o = doorOut(h, 2);
    if (d && d.p) { const p = d.p; Object.assign(pl, { health: Math.max(20, p.health), armor: p.armor, money: p.money, bank: p.bank, inv: p.inv, weapon: p.weapon, medkits: p.medkits || 0 }); pl.init(G.state.app); if (!G.net.pendingRoom && d.env) { G.env.time = d.env.time; G.env.day = d.env.day; G.env.setWeather(d.env.weather, true); } }
    else { Object.assign(pl, { health: 100, armor: 100, money: 500000, bank: 5000000, inv: { fist: { clip: 0, ammo: 0 } }, weapon: 'fist', medkits: 5 }); pl.init(G.state.app); if (b.army || /Navy/.test(b.role)) { pl.give('pistol', true); pl.give('carbine', true); } else pl.give('pistol', true); G.env.time = 9; G.env.setWeather('clear', true); }
    begin(o.x, o.z, o.h); G.boys.spawnCars(i); G.props.refreshSigns(); const ht = G.boys.homeType(i);
    U.bigLabel(b.name); U.notify((d ? 'Welcome back, ' : 'Playing as ') + b.name + '. ' + b.role + '.', '#f5c542');
    U.notify(b.villa ? 'This is your villa. Four cars and a bike are in the garage, the armory is by the left wall, and Zelda is somewhere in the garden.' : 'Your ' + ht + ' is behind you. The Boys Whip' + (b.cars.length ? ' and your own cars are' : ' is') + ' parked on the road outside.' + (b.boat ? ' Your patrol boat is at the dock on the lake.' : ''), '#f5c542');
    Gm.save();
  };
  Gm.toMenu = function () { Gm.save(true); if (G.net.active) G.net.leave(true); G.running = false; U.showHUD(false); U.showMainMenu(true); };
  Gm.fade = function (fn) { if (Gm.busy) return; Gm.busy = true; U.fade(true); setTimeout(() => { try { fn(); } finally { U.fade(false); setTimeout(() => { Gm.busy = false; }, 250); } }, 480); };
  Gm.enterInterior = function (p) {
    if (Gm.busy) return; if (G.wanted.level >= 3) { U.notify('Not while the whole force is after you!', '#e5484d'); return; }
    Gm.fade(() => { const o = doorOut(p); Gm.intPos.x = o.x; Gm.intPos.z = o.z; Gm.intH = o.h; Gm.intPoi = p; const s = I.build(p); G.activeScene = I.scene; I.scene.add(pl.ch.root); pl.mode = 'interior'; pl.pos.x = s.x; pl.pos.y = 0; pl.pos.z = s.z; pl.heading = s.h; pl.speed = 0; G.cam.yaw = s.h; G.cam.pitch = -0.08; U.bigLabel(p.c === 'vip' ? G.BOYS[+p.n].name : p.n); if (G.audio) G.audio.door(); });
  };
  Gm.exitInterior = function () { if (Gm.busy || pl.mode !== 'interior') return; Gm.fade(() => { I.clear(); G.activeScene = G.scene; G.scene.add(pl.ch.root); pl.mode = 'foot'; pl.teleport(Gm.intPos.x, Gm.intPos.z, Gm.intH); G.cam.yaw = Gm.intH; if (G.audio) G.audio.door(); }); };
  Gm.sleep = function (hours) { U.closeMenu(); Gm.fade(() => { if (!G.net.active) { G.env.time += hours; if (G.env.time >= 24) { G.env.time -= 24; G.env.day++; } } pl.health = pl.maxHealth; G.env.envT = 99; const ok = Gm.save(); U.notify(ok ? 'You slept ' + hours + ' hours. Game saved.' : 'You slept ' + hours + ' hours.', '#58d26b'); }); };
  Gm.deliver = function (id, color, poi, gi, boy) {
    const key = boy !== undefined ? 'b' + id : gi >= 0 ? 'g' + gi : 'x' + id; for (const v of V.list.slice()) if (v.ownKey === key && v.driver !== 'player') v.remove();
    const x = poi.rx != null ? poi.rx : poi.x, z = poi.rz != null ? poi.rz : poi.z; let v = null; for (let k = 0; k < 6 && !v; k++) { const ox = (k % 3 - 1) * 7, oz = (k > 2 ? 7 : 0); if (T.clearSpot(x + ox, z + oz, 3)) v = T.spawnOnRoad(x + ox, z + oz, id, { parked: true, color: color || undefined }); }
    if (!v) v = T.spawnOnRoad(x, z, id, { parked: true, color: color || undefined }); if (!v) return U.notify('No space outside right now');
    v.keep = true; v.owned = true; v.ownKey = key; U.notify(V.DEFS[id].name + ' is parked outside', '#58d26b');
  };
  // ---------- death / arrest ----------
  function nearestPoi(cat, x, z) { let best = null, bd = 1e9; for (const p of W.pois) { if (p.c !== cat || p.kiosk) continue; const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } } return best; }
  Gm.nearestPoi = nearestPoi;
  function respawn(cat, title, colr, sub, fn) {
    if (pl.dead) return; pl.dead = true; pl.aiming = false; if (pl.mode === 'vehicle') { const v = pl.vehicle; pl.exitVehicle(false); pl.pos.x = v.x; pl.pos.z = v.z; } else if (pl.mode === 'bus' || pl.mode === 'ride') pl.leaveRide(); else if (pl.mode === 'interior') { I.clear(); G.activeScene = G.scene; G.scene.add(pl.ch.root); pl.mode = 'foot'; pl.teleport(Gm.intPos.x, Gm.intPos.z); }
    pl.ch.root.position.set(pl.pos.x, pl.pos.y, pl.pos.z); U.closeMenu(); U.bigText(title, sub, colr); G.timeMul = 0.35; if (G.audio) G.audio.wasted(); failMission(title === 'WASTED' ? 'You died' : 'You were arrested'); endJob(); if (G.net.active && title === 'WASTED') G.net.died();
    setTimeout(() => { U.fade(true); setTimeout(() => { const p = nearestPoi(cat, pl.pos.x, pl.pos.z), o = doorOut(p, 2.2); G.wanted.clear(); G.wanted.level = 0; for (const n of N.list.slice()) if (n.cop && !n.keep) n.remove(); for (const v of V.list.slice()) if (v.ai && v.ai.chase) v.remove(); pl.dead = false; pl.health = pl.maxHealth; pl.teleport(o.x, o.z, o.h); G.cam.yaw = o.h; G.timeMul = 1; if (!G.net.active) G.env.time = (G.env.time + 5) % 24; G.env.envT = 99; fn(p); U.bigText(null); U.fade(false); G.preload(o.x, o.z); }, 600); }, 3200);
  }
  Gm.wasted = () => respawn('hospital', 'WASTED', '#e5484d', '', p => { const fee = Math.min(5000, Math.round(pl.money * 0.1)); pl.money -= fee; G.state.stats.wasted = (G.state.stats.wasted || 0) + 1; U.notify('Treated at ' + p.n + '. Bill: ' + G.taka(fee)); });
  Gm.busted = () => respawn('police', 'BUSTED', '#3b86d8', '', p => { const fine = Math.min(pl.money, 2500); pl.money -= fine; pl.inv = { fist: { clip: 0, ammo: 0 } }; pl.selectWeapon('fist', true); G.state.stats.busted = (G.state.stats.busted || 0) + 1; U.notify('Released from ' + p.n + '. Weapons confiscated, fine ' + G.taka(fine)); });
  Gm.onExplosion = function (x, y, z, r, src) {
    if (G.net.active && src !== 'net') G.net.send('x', [Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round(z * 10) / 10, Math.round(r / 9 * 10) / 10]);
    const d0 = Math.hypot(x - G.cam.pos.x, z - G.cam.pos.z); if (G.audio) G.audio.explosion(d0); G.fx.shake = Math.min(1.2, G.fx.shake + 14 / (d0 + 8));
    for (const p of N.list.slice()) { const d = Math.hypot(p.x - x, p.z - z); if (d < r && !p.dead) { const k = 1 - d / r; p.knock((p.x - x) / (d || 1) * 9 * k, (p.z - z) / (d || 1) * 9 * k, 260 * k, src === 'player' ? 'player' : 'npc'); } }
    for (const v of V.list) { if (v === src) continue; const d = Math.hypot(v.x - x, v.z - z); if (d < r + 2) { const k = 1 - d / (r + 2); v.sleep = false; v.damage(1600 * k); v.vx += (v.x - x) / (d || 1) * 7 * k; v.vz += (v.z - z) / (d || 1) * 7 * k; v.vy = 4 * k; v.y += 0.05; } }
    if (!pl.dead && pl.mode !== 'interior') { const d = Math.hypot(pl.pos.x - x, pl.pos.z - z); if (pl.vehicle === src || pl.ride === src) pl.damage(250, null); else if (d < r) pl.damage(170 * (1 - d / r) * (pl.vehicle ? 0.4 : 1), null); }
    if (src !== 'net' && (src === 'player' || (src && src.driver === 'player'))) G.wanted.crime('explosion', x, z); N.alarm(x, z, 90, 'npc');
  };
  // ---------- objective marker ----------
  let ring = null;
  function setMarker(x, z, r, colr, ic) { if (!ring) { ring = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); G.scene.add(ring); } ring.visible = true; ring.material.color.set(colr || '#ffd23a'); ring.position.set(x, W.groundY(x, z, 30) + 1.2, z); ring.scale.set(r, 2.4, r); Gm.mk = { x, z, r }; U.markers = [{ x, z, col: colr || '#f5c542', icon: ic || '' }]; U.gpsTarget = { x, z }; U.routeT = 0; }
  function clearMarker() { if (ring) ring.visible = false; Gm.mk = null; U.markers = []; U.gpsTarget = null; U.route = U.waypoint ? U.route : null; }
  const at = (m, extra) => m && Math.hypot(pl.pos.x - m.x, pl.pos.z - m.z) < m.r + (extra || 0);
  const roadPt = (x, z) => { const n = W.nearestRoad(x, z, 200, 6, 0, {}); return n ? { x: n.x, z: n.z } : { x, z }; };
  const place = n => { const p = W.places.find(q => q.n.toLowerCase().includes(n)); return p ? roadPt(p.x, p.z) : { x: 0, z: 0 }; };
  // ---------- missions ----------
  const goto = (pt, r, text, need) => ({ text, init() { setMarker(pt.x, pt.z, r); }, check(m) { if (need === 'veh' && pl.vehicle !== m.veh) { U.objective('Get back in the ' + m.veh.def.name); return false; } U.objective(text, m.time !== undefined ? fmt(m.time) : ''); return at(Gm.mk) && (need !== 'stop' || pl.speed < 2); } });
  const getIn = (id, pt, text, opt) => ({ text, init(m) { const v = T.spawnOnRoad(pt.x, pt.z, id, Object.assign({ parked: true }, opt || {})); v.keep = true; v.mission = true; m.veh = v; setMarker(v.x, v.z, 3, '#58d26b', '🚘'); }, check(m) { U.objective(text); if (m.veh.dead) return 'fail'; return pl.vehicle === m.veh; } });
  const fmt = s => Math.floor(s / 60) + ':' + ('0' + Math.floor(s % 60)).slice(-2);
  const MISSIONS = [
    { id: 'm1', name: 'Tong er Adda', reward: 5000, start: null, build() { const h = Gm.homePoi(), tea = nearestPoi('tea', h.x, h.z), gun = W.pois.find(p => p.c === 'gunshop' && /Kachukhet/.test(p.n)) || nearestPoi('gunshop', h.x, h.z), tp = { x: tea.x + Math.sin(tea.a) * 1.5, z: tea.z + Math.cos(tea.a) * 1.5 };
      return [goto(tp, 2.5, 'Walk to ' + tea.n + '. Rana Bhai is waiting with tea.'), { init() { U.subtitle('Rana Bhai: Eshecho? Shono, ei shohore tikte hole taka lagbe, ar ektu shahosh.'); setTimeout(() => U.subtitle('Rana Bhai: Amar bike ta nao. Kachukhet er ostrer dokan ta chine esho.'), 4200); this.t = 6; }, check(m, dt) { U.objective('Listen to Rana Bhai'); this.t -= dt; return this.t <= 0; } },
        getIn('bike', roadPt(tp.x, tp.z), "Get on Rana Bhai's bike (press F)"), goto(roadPt(gun.x, gun.z), 7, 'Ride to ' + gun.n + ' (follow the purple GPS line)', 'veh')]; }, done() { U.notify('The gun shop will sell to you now. Buy a pistol when you can afford it.'); U.notify('Tip: press J in a taxi, CNG, bus or on a bike to start a job and earn money.'); } },
    { id: 'm2', name: 'Special Delivery', reward: 12000, start: () => { const a = W.areas.find(q => /Bus Terminal/i.test(q.n)); return a ? roadPt((a.x0 + a.x1) / 2, (a.z0 + a.z1) / 2) : place('mohakhali'); }, build(s) { const dst = place('manikdi'); return [getIn('pickup', s, 'Get in the loaded pickup'), { init(m) { m.time = Math.max(240, Math.hypot(dst.x - s.x, dst.z - s.z) / 9); U.notify('Deliver the cargo to Manikdi before the timer runs out. Do not wreck it.'); }, check() { return true; } }, goto(dst, 8, 'Deliver the pickup to Manikdi', 'veh')]; } },
    { id: 'm3', name: 'Banani Repo', reward: 20000, start: () => { const p = W.pois.find(q => q.c === 'cardealer' && /Kakoli/.test(q.n)); return p ? roadPt(p.x, p.z) : place('banani'); }, build() { const src = place('banani'), d = W.pois.find(q => q.c === 'cardealer' && /ECB/.test(q.n)), dst = d ? roadPt(d.x, d.z) : place('matikata'); return [getIn('sports', src, 'A customer stopped paying. Take back the Falcon GT in Banani.', { color: '#f39c12' }), { init() { G.wanted.set(2); U.subtitle('Owner: Oi! Amar gari! Police! Police!'); }, check() { return true; } }, { text: '', init() { setMarker(dst.x, dst.z, 8); }, check(m) { if (m.veh.dead) return 'fail'; if (pl.vehicle !== m.veh) { U.objective('Get back in the Falcon GT'); return false; } U.objective('Bring the car to ECB Auto Gallery in one piece', 'Car condition ' + Math.round(m.veh.health / m.veh.def.hp * 100) + '%'); if (m.veh.health < m.veh.def.hp * 0.4) return 'fail'; return at(Gm.mk) && pl.speed < 3; } }]; } },
    { id: 'm4', name: 'Korail Clean-up', reward: 30000, start: () => { const g = W.checkpoints.find(c => /Sainik/.test(c.n)); return g ? roadPt(g.x + 30, g.z) : place('banani'); }, build() { const k = place('korail'); return [goto(k, 14, 'A gang is extorting shopkeepers near Korail. Go there. Bring a gun.'), { init(m) { m.foes = []; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28, x = k.x + Math.cos(a) * (8 + i * 2), z = k.z + Math.sin(a) * (8 + i * 2); if (W.buildingAt(x, z) >= 0) continue; const p = new N.Ped(x, z, 'thug', null, { hostile: true, weapon: i === 0 ? 'ak' : i < 3 ? 'smg' : 'pistol' }); p.keep = true; p.lsx = pl.pos.x; p.lsz = pl.pos.z; m.foes.push(p); } clearMarker(); }, check(m) { const left = m.foes.filter(p => !p.dead && !p.removed).length; U.objective('Take out the gang', left + ' left'); U.markers = m.foes.filter(p => !p.dead && !p.removed).map(p => ({ x: p.x, z: p.z, col: '#e5484d' })); return left === 0; } }, { init() { U.markers = []; G.wanted.set(2); }, check() { U.objective('Lose the police'); return G.wanted.level === 0; } }]; } },
    { id: 'm5', name: 'Airport Road Sprint', reward: 15000, start: () => { const g = W.checkpoints.find(c => /Staff Road/.test(c.n)); return roadPt(g.x, g.z + 40); }, build(s) { const g = W.checkpoints.find(c => /Jahangir/.test(c.n)), path = W.findPath(W.nearestNode(s.x, s.z, true), W.nearestNode(g.x, g.z - 60, true)) || []; const cps = []; let acc = 0, len = 0; for (let i = 1; i < path.length; i++) { const d = Math.hypot(W.nx[path[i]] - W.nx[path[i - 1]], W.nz[path[i]] - W.nz[path[i - 1]]); acc += d; len += d; if (acc > 550) { acc = 0; cps.push({ x: W.nx[path[i]], z: W.nz[path[i]] }); } } cps.push({ x: W.nx[path[path.length - 1]], z: W.nz[path[path.length - 1]] });
      return [{ init() { clearMarker(); }, check() { U.objective('Get in any fast vehicle to start the sprint to Jahangir Gate'); return !!pl.vehicle; } }, { init(m) { m.time = len / 15 + 20; U.notify('Race through every checkpoint to Shaheed Jahangir Gate!'); }, check() { return true; } }].concat(cps.map((c, i) => goto(c, 11, 'Checkpoint ' + (i + 1) + ' of ' + cps.length))); } }
  ];
  function nextMissionMarker() { if (Gm.mission || Gm.job) return; const nx = MISSIONS.find(m => !G.state.missions[m.id]); Gm.offer = null; if (!nx || !nx.start || G.state.boy >= 0 && nx.id === 'm1') { if (!Gm.job) clearMarker(); return; } const s = nx.start(); Gm.offer = { m: nx, s }; setMarker(s.x, s.z, 3, '#f5c542', 'M'); U.gpsTarget = null; }
  function startMission(i, s) { const def = typeof i === 'number' ? MISSIONS[i] : i; Gm.offer = null; const m = Gm.mission = { def, i: -1, steps: null }; m.steps = def.build(s); U.bigText(def.name, 'Mission', '#f5c542'); setTimeout(() => U.bigText(null), 2600); if (G.audio) G.audio.blip(2); advance(); }
  function advance() { const m = Gm.mission; m.i++; if (m.i >= m.steps.length) return passMission(); const st = m.steps[m.i]; if (st.init) st.init(m); }
  function passMission() { const m = Gm.mission, d = m.def; Gm.mission = null; clearMarker(); U.objective(null); G.state.missions[d.id] = 1; pl.money += d.reward; if (m.veh) { m.veh.keep = false; m.veh.mission = false; } U.bigText('MISSION PASSED', '+' + G.taka(d.reward), '#f5c542'); setTimeout(() => U.bigText(null), 3600); if (G.audio) G.audio.mission(true); if (d.done) d.done(); Gm.save(); setTimeout(nextMissionMarker, 4000); }
  function failMission(why) { const m = Gm.mission; if (!m) return; Gm.mission = null; clearMarker(); U.objective(null); if (m.veh) { m.veh.keep = false; m.veh.mission = false; } if (m.foes) for (const p of m.foes) p.keep = false; if (!pl.dead) { U.bigText('MISSION FAILED', why, '#e5484d'); setTimeout(() => U.bigText(null), 3200); if (G.audio) G.audio.mission(false); } setTimeout(nextMissionMarker, 5000); }
  // ---------- jobs ----------
  function endJob(msg) { const j = Gm.job; if (!j) return; if (j.pass) { j.pass.dispose(); } Gm.job = null; clearMarker(); U.objective(null); if (msg) U.notify(msg); setTimeout(nextMissionMarker, 500); }
  function randomRoadPoint(min, max) { for (let k = 0; k < 30; k++) { const a = Math.random() * 6.28, d = min + Math.random() * (max - min), n = W.nearestRoad(pl.pos.x + Math.cos(a) * d, pl.pos.z + Math.sin(a) * d, 120, 6, 1, {}); if (n && !W.roads[n.ri].elev) return { x: n.x, z: n.z }; } return roadPt(pl.pos.x + 200, pl.pos.z); }
  function startJob() {
    const v = pl.vehicle; if (!v || Gm.mission) return; if (Gm.job) return endJob('Job ended');
    if (v.id === 'taxi' || v.id === 'cng' || v.id === 'rickshaw') { const p = randomRoadPoint(120, 320); Gm.job = { type: 'taxi', phase: 0, v }; setMarker(p.x, p.z, 6, '#f5c542', '🙋'); U.notify('Passenger service started. Pick up the fare.'); }
    else if (v.def.kind === 'bus') { let best = null, bd = 1e9, bi = 0; T.routes.forEach(R => R.stops.forEach((s, i) => { const d = Math.hypot(s.rx - pl.pos.x, s.rz - pl.pos.z); if (d < bd) { bd = d; best = R; bi = i; } })); if (!best) return U.notify('No bus route nearby'); Gm.job = { type: 'bus', v, R: best, si: bi, wait: 0 }; const s = best.stops[bi]; setMarker(s.bx, s.bz, 7, '#1565c0', '🚌'); U.notify('Driving the ' + best.name + '. Stop at each bus stop.'); }
    else if (v.def.kind === 'bike') { const f = nearestPoi('food', pl.pos.x, pl.pos.z), p = roadPt(f.x, f.z); Gm.job = { type: 'food', phase: 0, v, from: f }; setMarker(p.x, p.z, 6, '#f5c542', '🍛'); U.notify('Food delivery started. Collect the order from ' + f.n + '.'); }
    else U.notify('Jobs: taxi or CNG (passengers), bus (route), motorbike (food delivery)');
  }
  function jobUpdate(dt) {
    const j = Gm.job, v = pl.vehicle; if (!j) return; if (v !== j.v) { j.away = (j.away || 0) + dt; U.objective('Return to your vehicle', Math.ceil(15 - j.away) + ' s'); if (j.away > 15 || j.v.dead) endJob('Job ended'); return; } j.away = 0; const stopped = pl.speed < 1.5;
    if (j.type === 'taxi') { if (j.phase === 0) { U.objective('Pick up the passenger'); if (at(Gm.mk) && stopped) { j.phase = 1; const ch = j.pass = new G.Char.Character(G.Char.randomApp('civ')); const s = v.geo.seats[1] || v.geo.seats[0]; ch.root.position.set(s[0], s[1], s[2]); v.group.add(ch.root); ch.update(1, { pose: 'sit' }); const hs = W.pois[(Math.random() * W.pois.length) | 0]; let dst = roadPt(hs.x, hs.z); if (Math.hypot(dst.x - pl.pos.x, dst.z - pl.pos.z) > 1500 || Math.hypot(dst.x - pl.pos.x, dst.z - pl.pos.z) < 250) dst = randomRoadPoint(400, 1100); j.dist = Math.hypot(dst.x - pl.pos.x, dst.z - pl.pos.z); j.t = 0; j.dn = W.placeAt(dst.x, dst.z); setMarker(dst.x, dst.z, 7); U.subtitle('Passenger: ' + j.dn + ' jaben? Cholen bhai.'); G.audio.cardoor(); } }
      else { j.t += dt; U.objective('Take the passenger to ' + j.dn); if (at(Gm.mk) && stopped) { const pay = Math.round(60 + j.dist * (v.id === 'rickshaw' ? 0.1 : 0.16) + Math.max(0, j.dist / 9 - j.t) * 1.5); pl.money += pay; G.state.stats.fares = (G.state.stats.fares || 0) + 1; G.audio.buy(); U.notify('Fare paid: ' + G.taka(pay), '#58d26b'); j.pass.dispose(); j.pass = null; j.phase = 0; const p = randomRoadPoint(120, 320); setMarker(p.x, p.z, 6, '#f5c542', '🙋'); } } }
    else if (j.type === 'bus') { const s = j.R.stops[j.si]; U.objective('Next stop: ' + s.n); if (at(Gm.mk, 2) && stopped) { j.wait += dt; U.objective('Passengers boarding at ' + s.n, Math.ceil(3 - j.wait) + ' s'); if (j.wait > 3) { j.wait = 0; const pay = 120 + Math.floor(Math.random() * 14) * 20; pl.money += pay; G.state.stats.busStops = (G.state.stats.busStops || 0) + 1; G.audio.buy(); U.notify('Tickets sold at ' + s.n + ': ' + G.taka(pay), '#58d26b'); j.si = (j.si + 1) % j.R.stops.length; const n = j.R.stops[j.si]; setMarker(n.bx, n.bz, 7, '#1565c0', '🚌'); } } else j.wait = 0; }
    else if (j.type === 'food') { if (j.phase === 0) { U.objective('Collect the order from ' + j.from.n); if (at(Gm.mk) && stopped) { j.phase = 1; let h = null; for (let k = 0; k < 60 && !h; k++) { const c = W.pois[(Math.random() * W.pois.length) | 0], d = Math.hypot(c.x - pl.pos.x, c.z - pl.pos.z); if ((c.c === 'house' || c.c === 'office') && d > 300 && d < 1100) h = c; } h = h || nearestPoi('house', pl.pos.x + 300, pl.pos.z); const p = roadPt(h.x, h.z); j.dist = Math.hypot(p.x - pl.pos.x, p.z - pl.pos.z); j.time = j.dist / 7 + 35; setMarker(p.x, p.z, 6, '#58d26b', '🏠'); G.audio.pickup(); U.notify('Order collected. Deliver it hot!'); } }
      else { j.time -= dt; U.objective('Deliver the food', fmt(Math.max(0, j.time))); if (j.time <= 0) { U.notify('The food went cold. No payment.', '#e5484d'); j.phase = 0; const p = roadPt(j.from.x, j.from.z); setMarker(p.x, p.z, 6, '#f5c542', '🍛'); } else if (at(Gm.mk) && stopped) { const pay = Math.round(180 + j.dist * 0.3 + j.time * 2); pl.money += pay; G.state.stats.deliveries = (G.state.stats.deliveries || 0) + 1; G.audio.buy(); U.notify('Delivered! Payment and tip: ' + G.taka(pay), '#58d26b'); j.phase = 0; j.from = nearestPoi('food', pl.pos.x, pl.pos.z); const p = roadPt(j.from.x, j.from.z); setMarker(p.x, p.z, 6, '#f5c542', '🍛'); } } }
  }
  Gm.onEnterVehicle = function (v) { if (Gm.mission || Gm.job) return; if (v.id === 'taxi' || v.id === 'cng' || v.def.kind === 'bus' || v.def.kind === 'bike') U.notify('Press J to start a job in this vehicle'); };
  let lx = 0, lz = 0;
  Gm.update = function (dt) {
    if (ring && ring.visible) { ring.rotation.y += dt; ring.material.opacity = 0.3 + Math.sin(G.time * 4) * 0.1; }
    const s = G.state.stats, d = Math.hypot(pl.pos.x - lx, pl.pos.z - lz); if (d < 30 && pl.mode !== 'interior') { if (pl.mode === 'vehicle') s.driven = (s.driven || 0) + d; else if (pl.mode === 'foot') s.walked = (s.walked || 0) + d; } lx = pl.pos.x; lz = pl.pos.z;
    Gm.autoT = (Gm.autoT || 0) + dt; if (Gm.autoT > 45 && !pl.dead && !Gm.mission && G.wanted.level === 0) { Gm.autoT = 0; Gm.save(); }
    if (pl.dead || pl.mode === 'interior') return;
    if (G.input.hit.KeyJ && !U.blocking) startJob();
    const m = Gm.mission;
    if (m) { if (m.time !== undefined) { m.time -= dt; if (m.time <= 0) return failMission('Out of time'); } if (m.veh && m.veh.dead) return failMission('The vehicle was destroyed'); const st = m.steps[m.i], r = st.check(m, dt); if (r === 'fail') failMission('The job went wrong'); else if (r) { if (G.audio && m.i < m.steps.length - 1) G.audio.blip(0); advance(); } }
    else if (Gm.job) jobUpdate(dt);
    else if (Gm.offer && pl.mode === 'foot' && at(Gm.mk, 0.5)) startMission(Gm.offer.m, Gm.offer.s);
    else if (Gm.offer && pl.mode === 'vehicle' && at(Gm.mk, 2)) U.prompt('Get out of the vehicle to start the mission: ' + Gm.offer.m.name);
  };
})();
