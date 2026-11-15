'use strict';
// Real time multiplayer over Firebase Realtime Database. Up to 18 players per room.
// Each client owns its own character, vehicle and health; everyone else sees an interpolated copy.
(function () {
  const G = window.G, C = G.cloud, W = G.world, V = G.Veh, N = G.npc, Wp = G.Weapons;
  const Nt = G.net = { active: false, room: null, remotes: new Map(), max: 18, kills: 0, deaths: 0, sendT: 0, last: '', lastAt: 0, evQ: [], shotT: 0, feed: [] };
  const VIDS = Object.keys(V.DEFS), DELAY = 0.26;
  const tagTex = name => { const [c, x] = G.cv(512, 96); x.font = 'bold 46px "Segoe UI",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 8; x.strokeStyle = 'rgba(0,0,0,.85)'; x.strokeText(name, 256, 50, 500); x.fillStyle = '#ffffff'; x.fillText(name, 256, 50, 500); return G.mkTex(c, { clamp: true }); };

  // ---------- a remote player; duck-types the pedestrian interface so bullets, cars and AI treat it as a person ----------
  class Remote {
    constructor(uid, meta) {
      this.uid = uid; this.kind = 'remote'; this.keep = true; this.cop = false; this.hostile = false; this.state = 'sit'; this.dead = false; this.down = 0; this.hp = 100; this.x = 0; this.y = -500; this.z = 0; this.heading = 0; this.scale = 1; this.near = 999; this.mode = 0; this.hidden = true; this.inVeh = false; this.speed = 0; this.flags = 0; this.k = 0; this.d = 0; this.buf = []; this.wid = 0; this.veh = null; this.par = null;
      this.ch = new G.Char.Character(G.Char.defaultApp()); this.tag = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false })); this.tag.scale.set(2.1, 0.4, 1); this.tag.position.y = 2.05; this.tag.renderOrder = 60; this.ch.root.add(this.tag); this.ch.root.visible = false;
      this.setMeta(meta); N.list.push(this);
    }
    setMeta(m) { this.name = (m.n || 'Player').slice(0, 24); this.boy = m.b === undefined ? -1 : m.b; let app = null; try { app = JSON.parse(m.a); } catch (e) { } if (app) { this.ch.setApp(app); this.scale = this.ch.h; } if (this.tag.material.map) this.tag.material.map.dispose(); this.tag.material.map = tagTex(this.name); this.tag.material.needsUpdate = true; this.wid = -1; }
    push(str) { const a = str.split(','); if (a.length < 14) return; const s = { t: performance.now() / 1000, x: a[0] / 10, y: a[1] / 10, z: a[2] / 10, h: a[3] / 100, mode: +a[4], speed: a[5] / 10, flags: +a[6], w: +a[7], pitch: a[8] / 100, vid: +a[9], vc: a[10], steer: a[11] / 100, hp: +a[12], poi: +a[13], k: +a[14] || 0, d: +a[15] || 0, host: a[16] || '', seat: +a[17] || 1 };
      const b = this.buf; if (b.length && (Math.hypot(s.x - b[b.length - 1].x, s.z - b[b.length - 1].z) > 60 || s.mode !== b[b.length - 1].mode || s.poi !== b[b.length - 1].poi)) b.length = 0; b.push(s); if (b.length > 4) b.shift(); this.k = s.k; this.d = s.d; this.hp = s.hp; }
    hit(dmg, part, dx, dz, src) { if (src === 'player' && !this.dead) Nt.send('h', { v: this.uid, d: Math.round(dmg), x: Math.round(this.x), z: Math.round(this.z) }); }
    knock() { }
    die() { }
    sync() { }
    remove(force) { if (!force) return; this.removed = true; this.dropVeh(true); this.ch.dispose(); if (this.tag.material.map) this.tag.material.map.dispose(); this.tag.material.dispose(); const i = N.list.indexOf(this); if (i >= 0) N.list.splice(i, 1); }
    dropVeh(destroy) { const v = this.veh; if (!v) return; this.veh = null; if (v.removed) return; if (destroy) { if (G.player.ride === v) G.player.leaveRide(); v.remove(); } else { v.remote = null; v.keep = false; v.sleep = true; v.vx = v.vz = 0; delete v.damage; delete v.impact; } }
    setParent(obj, key) { if (this.par === key) return; this.par = key; obj.add(this.ch.root); }
    update(dt) {
      const pl = G.player, b = this.buf, ch = this.ch; if (!b.length) { ch.root.visible = false; this.hidden = true; return; }
      const rt = performance.now() / 1000 - DELAY; let s0 = b[0], s1 = b[b.length - 1]; for (let i = b.length - 1; i > 0; i--) if (b[i - 1].t <= rt) { s0 = b[i - 1]; s1 = b[i]; break; }
      const span = s1.t - s0.t, a = span > 0.001 ? G.clamp((rt - s0.t) / span, 0, 1) : 1, cur = b[b.length - 1];
      this.x = s0.x + (s1.x - s0.x) * a; this.y = s0.y + (s1.y - s0.y) * a; this.z = s0.z + (s1.z - s0.z) * a; this.heading = G.angLerp(s0.h, s1.h, a);
      this.mode = cur.mode; this.speed = cur.speed; this.flags = cur.flags; this.poi = cur.poi; this.int = cur.mode === 2; this.dead = cur.mode === 4; this.inVeh = cur.mode === 1 || cur.mode === 3 || cur.mode === 5;
      const myInt = pl.mode === 'interior' && G.game.intPoi ? G.game.intPoi.id : -1, here = this.int ? myInt === cur.poi : myInt < 0;
      this.near = here ? Math.hypot(this.x - pl.pos.x, this.z - pl.pos.z) : 999; this.hidden = !here || this.inVeh;
      // vehicle driven by this player
      if (cur.mode === 1 && cur.vid >= 0 && VIDS[cur.vid]) {
        let v = this.veh; if (v && (v.removed || v.id !== VIDS[cur.vid])) { this.dropVeh(true); v = null; }
        if (!v) { v = this.veh = V.create(VIDS[cur.vid], this.x, this.z, this.heading, { color: '#' + cur.vc, y: this.y }); v.remote = this.uid; v.keep = true; v.sleep = true; v.owner = this; v.impact = () => { }; v.damage = d => { if (d > 0) Nt.vehHit(this.uid, d); }; }
        v.x = this.x; v.y = this.y; v.z = this.z; v.gy = this.y; v.h = this.heading; v.speed = this.speed; v.vx = Math.sin(v.h) * this.speed; v.vz = Math.cos(v.h) * this.speed; v.steer = G.damp(v.steer, cur.steer, 10, dt); v.spin += this.speed / v.def.wr * dt; for (const w of v.wheels) { w.m.rotation.x = v.spin; if (w.front) w.piv.rotation.y = v.steer; }
        if (v.def.kind === 'bike') v.roll = G.damp(v.roll, G.clamp(-G.wrapPi(s1.h - s0.h) / Math.max(0.05, span) * this.speed * 0.05, -0.6, 0.6), 6, dt);
        v.group.visible = here; v.setLights(!!(cur.flags & 16)); v.siren = !!(cur.flags & 32); v.sync();
        this.setParent(v.group, 'v' + cur.vid); const st = v.geo.seats[0]; ch.root.position.set(st[0], st[1], st[2]); ch.root.rotation.set(0, 0, 0); ch.root.visible = here; ch.update(dt, { pose: v.geo.pose || 'drive', steer: v.steer / 0.6, speed: Math.abs(this.speed) });
      } else {
        if (this.veh) this.dropVeh(false);
        let host = null; if (cur.mode === 5) host = cur.host === C.uid ? pl.vehicle : (Nt.remotes.get(cur.host) || {}).veh;
        if (cur.mode === 5 && host && !host.removed) { this.setParent(host.group, 'r' + cur.host); const st = host.geo.seats[Math.min(cur.seat, host.geo.seats.length - 1)]; ch.root.position.set(st[0], st[1], st[2]); ch.root.rotation.set(0, 0, 0); ch.root.visible = here; ch.update(dt, { pose: 'sit' }); }
        else if (cur.mode === 3 || cur.mode === 5) ch.root.visible = false;
        else { this.setParent(this.int ? G.interior.scene : G.scene, this.int ? 'i' : 'w'); ch.root.position.set(this.x, this.y, this.z); ch.root.rotation.set(0, this.heading, 0); ch.root.visible = here;
          if (here && this.near < 140) ch.update(dt, this.dead ? { pose: 'dead' } : { speed: this.speed, run: !!(cur.flags & 1), aim: !!(cur.flags & 2), air: !!(cur.flags & 4), pitch: cur.pitch, armed: cur.flags & 64 ? 2 : cur.flags & 128 ? 1 : 0, fists: !(cur.flags & 192), punch: cur.flags & 8 ? 0.5 : 0 }); }
      }
      if (cur.w !== this.wid) { this.wid = cur.w; const id = Wp.ORDER[cur.w]; ch.setGun(id && id !== 'fist' ? Wp.mesh(id) : null, id && Wp.DEFS[id].long); }
      this.tag.visible = here && this.near < 60 && !this.dead; if (this.tag.visible) { const sc = G.clamp(this.near / 14, 0.75, 2.6); this.tag.scale.set(2.1 * sc, 0.4 * sc, 1); this.tag.position.y = (this.inVeh ? 1.5 : 2.0) + sc * 0.08; }
    }
  }

  // ---------- events ----------
  Nt.send = function (t, d) { if (!Nt.active) return; const r = Nt.evRef.push(); r.set({ u: C.uid, t, d: JSON.stringify(d), ts: C.TS }).catch(() => { }); r.onDisconnect().remove(); Nt.evQ.push([performance.now(), r]); };
  let vhAcc = {}, vhT = 0;
  Nt.vehHit = function (uid, d) { vhAcc[uid] = (vhAcc[uid] || 0) + d; };
  Nt.shot = function (m, h, snd, big) { const now = performance.now(); if (now - Nt.shotT < 150) return; Nt.shotT = now; Nt.send('s', [Math.round(m.x * 10), Math.round(m.y * 10), Math.round(m.z * 10), Math.round(h.x * 10), Math.round(h.y * 10), Math.round(h.z * 10), snd, big ? 1 : 0]); };
  Nt.chat = function (text) { text = String(text).trim().slice(0, 140); if (!text) return; Nt.send('c', text); Nt.say(G.state.name, text, true); };
  Nt.say = function (who, text, me) { G.ui.chatLine(who, text, me); };
  Nt.died = function () { const pl = G.player, k = pl.lastHitBy && performance.now() - pl.lastHitAt < 9000 ? pl.lastHitBy : null; Nt.deaths++; G.state.stats.pvpD = (G.state.stats.pvpD || 0) + 1; Nt.send('k', { k, n: k && Nt.remotes.get(k) ? Nt.remotes.get(k).name : '' }); pl.lastHitBy = null; G.ui.chatLine('', k && Nt.remotes.get(k) ? Nt.remotes.get(k).name + ' killed you' : 'You died', false, '#e5484d'); };
  function onEvent(snap) {
    const e = snap.val(); if (!e || e.u === C.uid) return; let d; try { d = JSON.parse(e.d); } catch (x) { return; } const from = Nt.remotes.get(e.u), pl = G.player, name = from ? from.name : 'Player';
    if (e.t === 's') { if (pl.mode === 'interior') return; const mx = d[0] / 10, my = d[1] / 10, mz = d[2] / 10, hx = d[3] / 10, hy = d[4] / 10, hz = d[5] / 10, dist = Math.hypot(mx - G.cam.pos.x, mz - G.cam.pos.z); if (dist > 320) return; G.fx.tracer(mx, my, mz, hx, hy, hz); let dx = hx - mx, dy = hy - my, dz = hz - mz; const l = Math.hypot(dx, dy, dz) || 1; G.fx.muzzle(mx, my, mz, dx / l, dy / l, dz / l, !!d[7]); G.audio.shot(d[6], dist); if (dist < 60) N.alarm(mx, mz, 45, 'npc'); }
    else if (e.t === 'h') { if (d.v !== C.uid || pl.dead) return; pl.lastHitBy = e.u; pl.lastHitAt = performance.now(); if (pl.vehicle) { pl.vehicle.damage(d.d * 0.6); pl.damage(d.d * 0.3, null); } else pl.damage(d.d * 0.55, null); G.fx.blood(pl.pos.x, pl.pos.y + 1.2, pl.pos.z); }
    else if (e.t === 'vh') { if (d.v !== C.uid || !pl.vehicle) return; pl.lastHitBy = e.u; pl.lastHitAt = performance.now(); pl.vehicle.damage(d.d); }
    else if (e.t === 'x') { if (pl.mode === 'interior') return; pl.lastHitBy = e.u; pl.lastHitAt = performance.now(); G.fx.explosion(d[0], d[1], d[2], d[3] || 1, 'net'); }
    else if (e.t === 'c') Nt.say(name, String(d).slice(0, 140), false);
    else if (e.t === 'k') { if (d.k === C.uid) { Nt.kills++; G.state.stats.pvpK = (G.state.stats.pvpK || 0) + 1; G.ui.chatLine('', 'You killed ' + name, false, '#58d26b'); if (G.audio) G.audio.blip(2); } else G.ui.chatLine('', d.k ? (d.n || 'Someone') + ' killed ' + name : name + ' died', false, '#9aa0a6'); }
    else if (e.t === 'hn') { const dist = from ? from.near : 999; if (dist < 120) G.audio.horn(dist, d || 'car'); }
  }

  // ---------- joining and leaving ----------
  Nt.join = async function (room) {
    if (Nt.active) Nt.leave(true);
    if (!(await C.connect())) return { ok: false, why: C.state === 'unavailable' ? 'Multiplayer is not available in this copy of the game.' : 'Cannot reach the multiplayer server. Check your internet connection.' };
    room = String(room || 'dhaka').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20) || 'dhaka';
    const base = C.db.ref('rooms/' + room); let count = 0;
    try { const s = await Promise.race([base.child('m').once('value'), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 9000))]); s.forEach(c => { if (c.key !== C.uid) count++; }); } catch (e) { return { ok: false, why: 'The multiplayer server did not answer. It may not be set up yet.' }; }
    if (count >= Nt.max) return { ok: false, why: 'That server is full (' + Nt.max + ' players). Try another room name.' };
    Nt.room = room; Nt.base = base; Nt.mRef = base.child('m/' + C.uid); Nt.sRef = base.child('s/' + C.uid); Nt.evRef = base.child('e'); Nt.kills = 0; Nt.deaths = 0; Nt.last = ''; Nt.pending = {};
    Nt.mRef.onDisconnect().remove(); Nt.sRef.onDisconnect().remove(); try { await Nt.pushMeta(); } catch (e) { return { ok: false, why: 'The multiplayer server refused the connection.' }; }
    const M = base.child('m'), S = base.child('s');
    M.on('child_added', s => { if (s.key === C.uid || Nt.remotes.has(s.key)) return; const r = new Remote(s.key, s.val()); Nt.remotes.set(s.key, r); if (Nt.pending[s.key]) { r.push(Nt.pending[s.key]); delete Nt.pending[s.key]; } if (Nt.joinedAt && performance.now() - Nt.joinedAt > 3000) G.ui.chatLine('', r.name + ' joined', false, '#f5c542'); });
    M.on('child_changed', s => { const r = Nt.remotes.get(s.key); if (r) r.setMeta(s.val()); });
    M.on('child_removed', s => { const r = Nt.remotes.get(s.key); if (r) { G.ui.chatLine('', r.name + ' left', false, '#9aa0a6'); r.remove(true); Nt.remotes.delete(s.key); } });
    const onS = s => { if (s.key === C.uid) return; const r = Nt.remotes.get(s.key); if (r) r.push(s.val()); else Nt.pending[s.key] = s.val(); }; S.on('child_added', onS); S.on('child_changed', onS);
    Nt.evQuery = Nt.evRef.orderByChild('ts').startAt(C.now() - 500); Nt.evQuery.on('child_added', onEvent);
    Nt.listeners = [M, S]; Nt.active = true; Nt.joinedAt = performance.now(); Nt.oldScale = G.env.timeScale; Nt.oldAuto = G.env.auto; G.env.timeScale = 0; G.env.auto = false;
    G.ui.netStatus(); return { ok: true, room, count: count + 1 };
  };
  Nt.pushMeta = function () { if (!Nt.mRef) return Promise.resolve(); return Nt.mRef.set({ n: (G.state.name || 'Player').slice(0, 24), a: JSON.stringify(G.player.ch.app), b: G.state.boy, j: C.TS }); };
  Nt.leave = function (quiet) {
    if (!Nt.active) return; Nt.active = false; for (const l of Nt.listeners) l.off(); Nt.evQuery.off(); Nt.mRef.remove().catch(() => { }); Nt.sRef.remove().catch(() => { }); Nt.mRef.onDisconnect().cancel(); Nt.sRef.onDisconnect().cancel(); for (const [, r] of Nt.evQ) r.remove().catch(() => { }); Nt.evQ.length = 0;
    for (const r of Nt.remotes.values()) r.remove(true); Nt.remotes.clear(); G.env.timeScale = Nt.oldScale; G.env.auto = Nt.oldAuto; Nt.room = null; if (!quiet) G.ui.notify('You left the multiplayer server'); G.ui.netStatus();
  };
  Nt.players = function () { const a = [{ name: G.state.name, k: Nt.kills, d: Nt.deaths, me: true, boy: G.state.boy }]; for (const r of Nt.remotes.values()) a.push({ name: r.name, k: r.k, d: r.d, boy: r.boy, r }); return a.sort((x, y) => y.k - x.k || x.d - y.d); };

  // ---------- per frame ----------
  const WEATHER = ['clear', 'clear', 'clear', 'cloudy', 'cloudy', 'haze', 'overcast', 'overcast', 'drizzle', 'rain', 'rain', 'storm', 'clear', 'cloudy', 'clear', 'haze'];
  Nt.update = function (dt) {
    if (!Nt.active) return; const pl = G.player, E = G.env, now = performance.now();
    // shared clock and weather: derived from server time so every player sees the same sky
    const gs = C.now() / 1000 / 120, hour = gs % 24; E.time = hour; E.day = Math.floor(gs / 24) % 7; const blk = Math.floor(gs / 3); let w = WEATHER[G.hash(blk * 7919 + 13) % WEATHER.length]; if (hour > 3.5 && hour < 7.5 && G.hash(blk) % 3 === 0) w = 'fog'; if (E.weather !== w) E.setWeather(w);
    // my state
    Nt.sendT -= dt; if (Nt.sendT <= 0) {
      const mode = pl.dead ? 4 : pl.mode === 'foot' ? 0 : pl.mode === 'vehicle' ? 1 : pl.mode === 'interior' ? 2 : pl.mode === 'mpride' ? 5 : 3, v = pl.vehicle, d = Wp.DEFS[pl.weapon];
      const flags = (pl.speed > 4.6 ? 1 : 0) | (pl.aiming || pl.firedT > 0 ? 2 : 0) | (!pl.grounded ? 4 : 0) | (pl.punchT > 0 ? 8 : 0) | (v && v.lights ? 16 : 0) | (v && v.siren ? 32 : 0) | (pl.armed && d.long ? 64 : 0) | (pl.armed && !d.long ? 128 : 0);
      const moving = pl.speed > 0.2 || pl.aiming || (v && Math.abs(v.speed) > 0.2); Nt.sendT = moving ? 0.14 : 0.45;
      const s = [Math.round(pl.pos.x * 10), Math.round(pl.pos.y * 10), Math.round(pl.pos.z * 10), Math.round(G.wrapPi(pl.heading) * 100), mode, Math.round((v ? v.speed : pl.speed) * 10), flags, Wp.ORDER.indexOf(pl.weapon), Math.round(G.cam.pitch * 100), v ? VIDS.indexOf(v.id) : -1, v ? String(v.color).replace('#', '') : '0', v ? Math.round(v.steer * 100) : 0, Math.round(pl.health), mode === 2 && G.game.intPoi ? G.game.intPoi.id : -1, Nt.kills, Nt.deaths, mode === 5 && pl.ride ? pl.ride.remote : '', pl.rideSeat || 1].join(',');
      if (s !== Nt.last || now - Nt.lastAt > 4000) { Nt.last = s; Nt.lastAt = now; Nt.sRef.set(s).catch(() => { }); }
    }
    vhT -= dt; if (vhT <= 0) { vhT = 0.25; for (const u in vhAcc) { Nt.send('vh', { v: u, d: Math.round(vhAcc[u]) }); } vhAcc = {}; }
    while (Nt.evQ.length && now - Nt.evQ[0][0] > 6000) { const r = Nt.evQ.shift()[1]; r.remove().catch(() => { }); r.onDisconnect().cancel(); }
  };
})();
