'use strict';
// Pedestrians, soldiers, police, wanted level, pickups.
(function () {
  const G = window.G, W = G.world, Wp = G.Weapons;
  const N = G.npc = { list: [], target: 26, pickups: [], guards: [] };
  const Wt = G.wanted = { level: 0, kills: 0, evade: 0, seenT: 99, copVeh: 0, spawnT: 0, flash: false };
  const P = { x: 0, z: 0 }, tmp = {};
  const SAY = {
    bump: ['Ei bhai! Dekhe cholun!', 'Arey! Chokh nai naki?', 'Bhai, shamne dekhen!', 'Dhakka dicchen keno?'],
    flee: ['Bachao! Bachao!', 'Guli! Palao shobai!', 'Allah! Dourao!', 'Ore baba re!'],
    cop: ['Thamo! Police!', 'Hands up! Astro felo!', 'Dhor oke! Dhor!', 'Nor-bi na ekdom!'],
    soldier: ['Halt! Eta restricted area!', 'Weapon down! Ekhuni!', 'Freeze! Military Police!'],
    hit: ['Aah! Marlo re!', 'Ki korchen bhai?!', 'Police ke daktesi!'],
    robbed: ['Niye jan bhai, kichu korben na!', 'Taka nin, guli korben na!']
  };
  N.say = function (kind, ped) { if (!G.ui || (N.sayT || 0) > G.time) return; if (ped && ped.near > 22) return; N.sayT = G.time + 3.5; G.ui.subtitle(G.pick(SAY[kind])); };
  const offFor = (rd, side) => (rd.t >= 9 ? 0.5 : rd.t >= 6 ? Math.max(0.6, rd.w / 2 - 0.6) : rd.w / 2 + 1.15) * side;

  class Ped {
    constructor(x, z, kind, app, opt) {
      opt = opt || {}; this.kind = kind; this.x = x; this.z = z; this.y = opt.y || 0; this.heading = Math.random() * 6.28; this.hp = kind === 'civ' || kind === 'female' || kind === 'worker' ? 100 : kind === 'rab' ? 220 : 150;
      this.ch = new G.Char.Character(app || G.Char.randomApp(kind)); this.scale = this.ch.h; this.state = opt.state || 'walk'; this.speed = 0; this.walk = 1.15 + Math.random() * 0.5; this.side = Math.random() < 0.5 ? 1 : -1; this.t = Math.random() * 5; this.dead = false; this.down = 0; this.kx = 0; this.kz = 0; this.near = 99; this.seeT = Math.random(); this.see = false; this.shootT = 1; this.burst = 0;
      this.cop = kind === 'police' || kind === 'soldier' || kind === 'mp' || kind === 'rab'; this.hostile = !!opt.hostile; this.money = 40 + Math.floor(Math.random() * 500);
      const wid = opt.weapon || (kind === 'police' ? 'pistol' : kind === 'soldier' || kind === 'mp' ? 'carbine' : kind === 'rab' ? 'smg' : null);
      if (wid) { this.weapon = Wp.DEFS[wid]; this.ch.setGun(Wp.mesh(wid), this.weapon.long); }
      (opt.scene || G.scene).add(this.ch.root); this.sync(); N.list.push(this);
    }
    sync() { const r = this.ch.root; r.position.set(this.x, this.y, this.z); r.rotation.y = this.heading; }
    setPath(prev, next) { this.prev = prev; this.next = next; this.rd = W.roads[roadOf(prev, next)] || null; }
    hit(dmg, part, dx, dz, src) {
      if (this.dead) return; this.hp -= dmg; N.alarm(this.x, this.z, 40, src);
      if (src === 'player') { Wt.crime(this.cop ? 'cop' : 'assault', this.x, this.z); if (this.cop || this.kind === 'thug') this.hostile = true; }
      if (this.hp <= 0) this.die(src, dx, dz); else if (!this.cop && !this.hostile) { this.state = 'flee'; this.t = 9; N.say('hit', this); }
    }
    knock(vx, vz, dmg, src) { if (this.dead) return; this.hp -= dmg; this.down = 2.2 + Math.random(); this.kx = vx; this.kz = vz; if (src === 'player') Wt.crime(this.cop ? 'cop' : 'hitrun', this.x, this.z); if (this.hp <= 0) this.die(src, vx, vz); if (G.audio && this.near < 40) G.audio.thud(); }
    die(src, dx, dz) {
      if (this.dead) return; this.dead = true; this.deadT = 28; this.state = 'dead'; if (dx !== undefined && Math.hypot(dx, dz) > 0.01) this.heading = Math.atan2(-dx, -dz);
      if (src === 'player') { Wt.crime(this.cop ? 'copkill' : 'kill', this.x, this.z); G.state.stats.kills = (G.state.stats.kills || 0) + 1; }
      N.drop(this.x, this.z, 'cash', this.money); if (this.weapon && Math.random() < 0.7) N.drop(this.x + 0.5, this.z + 0.3, 'ammo', this.weapon.id);
      if (this.onDeath) this.onDeath(this);
    }
    remove() { this.removed = true; this.ch.dispose(); const i = N.list.indexOf(this); if (i >= 0) N.list.splice(i, 1); }
    moveTo(tx, tz, spd, dt) {
      let dx = tx - this.x, dz = tz - this.z; const d = Math.hypot(dx, dz); if (d < 0.05) { this.speed = 0; return d; } dx /= d; dz /= d;
      this.heading = G.angLerp(this.heading, Math.atan2(dx, dz), 1 - Math.exp(-9 * dt)); const step = Math.min(d, spd * dt); this.x += dx * step; this.z += dz * step; this.speed = spd; return d;
    }
    update(dt) {
      const pl = G.player, ch = this.ch; this.near = Math.hypot(this.x - pl.pos.x, this.z - pl.pos.z);
      if (this.dead) { this.deadT -= dt; if (this.near < 80) ch.update(dt, { pose: 'dead' }); this.y = G.damp(this.y, W.groundY(this.x, this.z, this.y), 6, dt); this.sync(); if (this.deadT <= 0 && this.near > 25) this.remove(); return; }
      if (this.down > 0) { this.down -= dt; this.x += this.kx * dt; this.z += this.kz * dt; const k = Math.exp(-3 * dt); this.kx *= k; this.kz *= k; P.x = this.x; P.z = this.z; if (W.collide(P, 0.3, this.y, true)) { this.x = P.x; this.z = P.z; } ch.update(dt, { pose: 'dead' }); this.sync(); if (this.down <= 0) { if (this.cop || this.hostile) this.hostile = this.hostile || Wt.level > 0; else { this.state = 'flee'; this.t = 8; } } return; }
      let run = false, aim = false, pose = null; this.speed = 0; const st = this.state;
      const hostile = this.hostile || (this.cop && Wt.level > 0);
      if (hostile) { run = this.combat(dt); aim = this.aiming; }
      else if (st === 'walk') {
        if (this.next === undefined || this.next < 0) { this.state = 'idle'; this.t = 3; }
        else { const A = this.prev, B = this.next, dx = W.nx[B] - W.nx[A], dz = W.nz[B] - W.nz[A], l = Math.hypot(dx, dz) || 1, o = this.rd ? offFor(this.rd, this.side) : 0; const tx = W.nx[B] + dz / l * o, tz = W.nz[B] - dx / l * o;
          if (this.moveTo(tx, tz, this.walk * (G.env.rain > 0.4 ? 1.5 : 1), dt) < 1.4) { const e = W.adjP[B]; let nxt = -1; if (e) { let tot = 0; const c = []; for (let i = 0; i < e.length; i += 3) { if (e[i] === A) continue; const rd = W.roads[e[i + 2]]; const w = rd.elev && rd.t < 9 ? 0.02 : rd.t <= 2 ? 0.6 : 2; c.push(e[i], w); tot += w; } if (c.length) { let r = Math.random() * tot; for (let i = 0; i < c.length; i += 2) { r -= c[i + 1]; if (r <= 0) { nxt = c[i]; break; } } if (nxt < 0) nxt = c[0]; } else nxt = A; } this.setPath(B, nxt); if (Math.random() < 0.06) { this.state = 'idle'; this.t = 3 + Math.random() * 8; this.phone = Math.random() < 0.5; } } }
        if (G.env.rain > 0.4) run = this.speed > 1.6;
      } else if (st === 'idle' || st === 'guard') { if (st === 'idle') { this.t -= dt; if (this.t <= 0) this.state = 'walk'; if (this.phone) pose = 'phone'; } else if (this.gh !== undefined) this.heading = G.angLerp(this.heading, this.near < 12 ? Math.atan2(pl.pos.x - this.x, pl.pos.z - this.z) : this.gh, 1 - Math.exp(-4 * dt)); }
      else if (st === 'flee') { this.t -= dt; const dx = this.x - (this.fx !== undefined ? this.fx : pl.pos.x), dz = this.z - (this.fz !== undefined ? this.fz : pl.pos.z), d = Math.hypot(dx, dz) || 1; this.moveTo(this.x + dx / d * 6 + Math.sin(this.t * 2 + this.walk * 9) * 2, this.z + dz / d * 6 + Math.cos(this.t * 2 + this.walk * 9) * 2, 5.4, dt); run = true; if (this.t <= 0) { this.state = 'walk'; this.fx = undefined; const n = W.nearestRoad(this.x, this.z, 60, 10, 1, tmp); if (n) { const rd = W.roads[n.ri]; this.setPath(rd.k[n.i], rd.k[n.i + 1]); } } }
      else if (st === 'cower' || st === 'handsup') { this.t -= dt; pose = st; if (this.t <= 0) { this.state = 'flee'; this.t = 6; } }
      else if (st === 'sit') pose = 'sit';
      // collisions + ground
      if (this.speed > 0 && this.near < 80) { P.x = this.x; P.z = this.z; if (W.collide(P, 0.3, this.y, st === 'walk')) { this.x = P.x; this.z = P.z; if (st === 'flee') this.t -= dt * 2; } }
      if (this.near < 90) this.y = W.groundY(this.x, this.z, this.y + 0.2);
      // run over by vehicles / bumped by player
      if (this.near < 70 && !this.inVeh) { for (const v of G.Veh.list) { if (Math.abs(v.x - this.x) > 7 || Math.abs(v.z - this.z) > 7 || Math.abs(v.y - this.y) > 1.5) continue; const rx = this.x - v.x, rz = this.z - v.z, ah = rx * v.fx + rz * v.fz, sd = rx * v.fz - rz * v.fx, sp = Math.hypot(v.vx, v.vz); if (Math.abs(ah) < v.def.L / 2 + 0.3 && Math.abs(sd) < v.def.W / 2 + 0.3) { if (sp > 2.2) { this.knock(v.vx * 0.8 + (sd > 0 ? v.fz : -v.fz) * 2, v.vz * 0.8 + (sd > 0 ? -v.fx : v.fx) * 2, sp * 7.5, v.driver === 'player' ? 'player' : 'npc'); v.vx *= 0.96; v.vz *= 0.96; } else { const s = sd > 0 ? 1 : -1; this.x += v.fz * s * dt * 3; this.z -= v.fx * s * dt * 3; } } }
        if (pl.mode === 'foot' && this.near < 0.62) { const dx = this.x - pl.pos.x, dz = this.z - pl.pos.z, d = this.near || 0.01; this.x += dx / d * (0.62 - d); this.z += dz / d * (0.62 - d); if (pl.speed > 4.5 && !this.cop) { N.say('bump', this); } } }
      if (this.near < 85) ch.update(dt, { speed: this.speed, run, aim, pitch: this.aimPitch || 0, armed: this.weapon && (hostile || this.cop) ? (this.weapon.long ? 2 : 1) : 0, pose });
      this.sync();
    }
    combat(dt) { // returns running flag
      const pl = G.player, d = this.near, tx = pl.pos.x, tz = pl.pos.z; this.seeT -= dt; this.aiming = false;
      if (this.seeT <= 0) { this.seeT = 0.3; this.see = d < 80 && W.los(this.x, this.y + 1.5, this.z, tx, pl.pos.y + 1.2, tz); if (this.see) { this.lsx = tx; this.lsz = tz; } }
      if (this.see && this.cop) Wt.seenT = 0;
      const lethal = this.weapon && (this.hostile || Wt.level >= 2 || (Wt.level >= 1 && pl.armed));
      if (pl.dead || pl.mode === 'interior') return false;
      if (this.see && lethal && d < 55) {
        this.heading = G.angLerp(this.heading, Math.atan2(tx - this.x, tz - this.z), 1 - Math.exp(-10 * dt)); this.aiming = true; this.aimPitch = Math.atan2(pl.pos.y + 1.1 - (this.y + 1.4), d);
        this.shootT -= dt; if (this.shootT <= 0) { const def = this.weapon; if (this.burst <= 0) this.burst = def.auto ? 3 + (Math.random() * 3 | 0) : 1; this.burst--; this.shootT = this.burst > 0 ? 60 / def.rpm : 0.9 + Math.random() * 1.4;
          const acc = (this.kind === 'rab' ? 0.5 : this.kind === 'thug' ? 0.3 : 0.38) * (pl.vehicle ? 0.6 : 1) * (pl.speed > 4 ? 0.7 : 1);
          if (Wp.npcShoot(this, tx, pl.pos.y + 1.1, tz, def, acc)) { if (pl.vehicle) { pl.vehicle.damage(def.dmg * 0.8); if (Math.random() < 0.25) pl.damage(def.dmg * 0.25, this); } else pl.damage(def.dmg * 0.34, this); } }
        if (d > 24) { this.moveTo(tx, tz, 4.6, dt); return true; } return false;
      }
      const gx = this.see ? tx : this.lsx, gz = this.see ? tz : this.lsz; if (gx === undefined) { return false; }
      if (d > 1.9 || !this.see) { const r = this.moveTo(gx, gz, 5.3, dt); if (!this.see && r < 2) { this.lsx = undefined; } return true; }
      if (this.cop && Wt.level === 1 && !pl.vehicle && pl.speed < 2) { Wt.arrestT = (Wt.arrestT || 0) + dt; if (Wt.arrestT > 1.3) G.game.busted(); } else if (!pl.vehicle && this.t2 === undefined) { /* melee */ this.punch = (this.punch || 0) + dt; if (this.punch > 0.9) { this.punch = 0; pl.damage(9, this); if (G.audio) G.audio.thud(); } }
      return false;
    }
  }
  N.Ped = Ped;
  function roadOf(a, b) { const e = W.adjP[a]; if (e) for (let i = 0; i < e.length; i += 3) if (e[i] === b) return e[i + 2]; return -1; }
  N.spawnAt = function (x, z, kind, opt) { const p = new Ped(x, z, kind, opt && opt.app, opt); const n = W.nearestRoad(x, z, 70, 10, 1, tmp); if (n) { const rd = W.roads[n.ri], fwd = Math.random() < 0.5; p.setPath(rd.k[n.i + (fwd ? 0 : 1)], rd.k[n.i + (fwd ? 1 : 0)]); } p.y = W.groundY(x, z, (opt && opt.y) || 0.5); return p; };
  N.alarm = function (x, z, r, src) { // gunfire / violence nearby
    let said = false; for (const p of N.list) { if (p.dead || p.down > 0 || p.cop || p.hostile || p.state === 'sit') continue; const d = Math.hypot(p.x - x, p.z - z); if (d > r) continue; if (p.state !== 'flee' && p.state !== 'cower') { if (Math.random() < 0.25 && d < 15) { p.state = 'cower'; p.t = 4 + Math.random() * 4; } else { p.state = 'flee'; p.t = 8 + Math.random() * 6; } p.fx = x; p.fz = z; if (!said) { N.say('flee', p); said = true; } } }
    G.traffic.panic(x, z, r * 0.8);
  };
  N.witness = function (x, z, r) { for (const p of N.list) if (!p.dead && Math.hypot(p.x - x, p.z - z) < r) return true; return false; };
  // ---------- pickups ----------
  N.drop = function (x, z, type, val) { const col = type === 'cash' ? 0x3fae5a : type === 'health' ? 0xe74c3c : type === 'armor' ? 0x3498db : 0xd4ac0d; const m = new THREE.Mesh(N.pgeo || (N.pgeo = new THREE.BoxGeometry(0.32, 0.18, 0.2)), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.6 })); m.position.set(x, 0.35 + W.groundY(x, z, 1), z); G.scene.add(m); N.pickups.push({ m, x, z, type, val, t: 60 }); };
  function updatePickups(dt) { const pl = G.player; for (let i = N.pickups.length - 1; i >= 0; i--) { const p = N.pickups[i]; p.t -= dt; p.m.rotation.y += dt * 2.5; p.m.position.y += Math.sin(G.time * 3 + i) * 0.002; let take = false; if (pl.mode === 'foot' && Math.hypot(p.x - pl.pos.x, p.z - pl.pos.z) < 1.3 && !pl.dead) { take = true; if (p.type === 'cash') { pl.money += p.val; G.ui.notify('Picked up ' + G.taka(p.val), '#3fae5a'); } else if (p.type === 'ammo') { const def = Wp.DEFS[p.val]; if (!pl.inv[p.val]) { pl.inv[p.val] = { clip: def.mag, ammo: def.mag }; G.ui.notify('Picked up ' + def.name); } else { pl.inv[p.val].ammo += def.mag; G.ui.notify(def.name + ' ammo +' + def.mag); } } else if (p.type === 'health') pl.health = Math.min(pl.maxHealth, pl.health + p.val); else if (p.type === 'armor') pl.armor = 100; if (G.audio) G.audio.pickup(); }
      if (take || p.t <= 0) { G.scene.remove(p.m); p.m.material.dispose(); N.pickups.splice(i, 1); } } }

  // ---------- wanted system ----------
  Wt.set = function (l) { l = G.clamp(l, 0, 5); if (l > Wt.level) { Wt.level = l; Wt.seenT = 0; Wt.evade = 0; if (G.ui) G.ui.notify(l >= 4 ? 'Special forces are after you!' : W.inCantt(G.player.pos.x, G.player.pos.z) ? 'Military Police alerted!' : 'Police alerted!', '#e74c3c'); if (G.audio) G.audio.blip(2); } };
  Wt.clear = function () { if (Wt.level > 0 && G.ui) G.ui.notify('Wanted level cleared', '#3fae5a'); Wt.level = 0; Wt.kills = 0; Wt.arrestT = 0; Wt.flash = false; for (const p of N.list) if (p.cop) { p.see = false; p.lsx = undefined; } for (const v of G.Veh.list) if (v.ai && v.ai.chase) { v.ai.chase = false; v.ai.route = null; v.ai.done = false; v.siren = false; v.ai.nn = -1; v.ai.stuck = 0; } };
  Wt.crime = function (type, x, z) {
    const cantt = W.inCantt(x, z), seen = cantt || N.witness(x, z, 55) || Wt.level > 0;
    if (type === 'copkill') { Wt.kills += 2; Wt.set(Math.max(3, Wt.level + 1)); return; }
    if (type === 'cop') { Wt.set(Math.max(2, Wt.level)); return; }
    if (type === 'explosion') { Wt.set(Math.max(3, Wt.level)); return; }
    if (!seen && Math.random() < 0.6) return;
    if (type === 'kill') { Wt.kills++; Wt.set(Wt.kills >= 12 ? 5 : Wt.kills >= 7 ? 4 : Wt.kills >= 3 ? 3 : 2); }
    else if (type === 'assault' || type === 'hitrun' || type === 'rob') Wt.set(Math.max(Wt.level, type === 'rob' ? 2 : 1));
    else if (type === 'vehicle' || type === 'theft') { if (Math.random() < (cantt ? 0.9 : 0.35)) Wt.set(Math.max(Wt.level, 1)); }
  };
  Wt.gunfire = function (x, z) { N.alarm(x, z, 55, 'player'); if ((Wt.gfT || 0) > G.time) return; Wt.gfT = G.time + 1.5; const cantt = W.inCantt(x, z); if (cantt) Wt.set(Math.max(Wt.level, 2)); else if (N.witness(x, z, 60) && Math.random() < 0.5) Wt.set(Math.max(Wt.level, 1)); };
  function copKindHere() { const pl = G.player; return Wt.level >= 5 ? 'soldier' : Wt.level >= 4 ? 'rab' : W.inCantt(pl.pos.x, pl.pos.z) ? 'mp' : 'police'; }
  Wt.update = function (dt) {
    const pl = G.player; if (Wt.level <= 0) return;
    Wt.seenT += dt; Wt.flash = Wt.seenT > 3; if (!(Wt.arrestT > 0 && Wt.seenT < 0.5)) Wt.arrestT = Math.max(0, (Wt.arrestT || 0) - dt * 0.5);
    if (Wt.seenT > 14 + Wt.level * 7 && pl.mode !== 'interior') { Wt.clear(); return; }
    // dispatch
    Wt.spawnT -= dt; if (Wt.spawnT > 0 || pl.mode === 'interior') return; Wt.spawnT = 2.2;
    let veh = 0, foot = 0; for (const v of G.Veh.list) if (v.ai && v.ai.chase && !v.dead) veh++; for (const p of N.list) if (p.cop && !p.dead && p.near < 120) foot++;
    const kind = copKindHere();
    if (veh < Math.min(4, Wt.level) && Wt.level >= 2 || (Wt.level === 1 && veh < 1 && pl.vehicle)) {
      const a = Math.random() * 6.28, d = 130 + Math.random() * 60, v = G.traffic.spawnOnRoad(pl.pos.x + Math.cos(a) * d, pl.pos.z + Math.sin(a) * d, kind === 'police' ? 'police' : kind === 'rab' ? 'suv' : 'mpjeep', { color: kind === 'rab' ? '#0c0c0e' : undefined });
      if (v) { if (Math.hypot(v.x - pl.pos.x, v.z - pl.pos.z) < 70) v.remove(); else { G.traffic.setAI(v, v.nodeA, v.nodeB, { chase: true, kind, cops: 2 }); v.siren = true; v.setLights(true); v.copKind = kind; } }
    }
    if (foot < Wt.level * 2 && Wt.level <= 2 || foot < 2) { const a = Math.random() * 6.28, d = 60 + Math.random() * 40, x = pl.pos.x + Math.cos(a) * d, z = pl.pos.z + Math.sin(a) * d, n = W.nearestRoad(x, z, 50, 10, 1, tmp); if (n && W.buildingAt(n.x, n.z) < 0 && !W.los(G.cam.pos.x, G.cam.pos.y, G.cam.pos.z, n.x, 1.4, n.z)) { const p = N.spawnAt(n.x, n.z, kind, { y: n.y }); p.lsx = pl.pos.x; p.lsz = pl.pos.z; } }
    // dismount arriving units
    for (const v of G.Veh.list) { const a = v.ai; if (!a || !a.chase || !a.cops) continue; if (a.arrived || (v.near < 30 && Math.abs(v.speed) < 1.2 && !pl.vehicle) || v.health < v.def.hp * 0.3) { for (let i = 0; i < a.cops; i++) { const s = i ? 1 : -1, x = v.x + v.fz * s * (v.def.W / 2 + 0.8), z = v.z - v.fx * s * (v.def.W / 2 + 0.8); const p = new Ped(x, z, v.copKind, null, { y: v.y }); p.lsx = pl.pos.x; p.lsz = pl.pos.z; } a.cops = 0; a.driver = undefined; v.ai = null; v.ctl = null; } }
  };

  // ---------- ambient population ----------
  function spawnAmbient(px, pz) {
    const ang = Math.random() * 6.283, d = 32 + Math.random() * 75, x = px + Math.cos(ang) * d, z = pz + Math.sin(ang) * d;
    const n = W.nearestRoad(x, z, 40, 10, 1, tmp); if (!n) return; const rd = W.roads[n.ri]; if (rd.elev && rd.t < 9) return;
    const A = rd.k[n.i], B = rd.k[n.i + 1], dx = W.nx[B] - W.nx[A], dz = W.nz[B] - W.nz[A], l = Math.hypot(dx, dz) || 1, side = Math.random() < 0.5 ? 1 : -1, o = offFor(rd, side), sx = n.x + dz / l * o, sz = n.z - dx / l * o;
    if (W.buildingAt(sx, sz) >= 0) return; const cam = G.cam, cdx = sx - cam.pos.x, cdz = sz - cam.pos.z, cd = Math.hypot(cdx, cdz); if (cd < 28) return; if (cd < 70 && (cdx * cam.dir.x + cdz * cam.dir.z) / cd > 0.5 && W.los(cam.pos.x, cam.pos.y, cam.pos.z, sx, 1.5, sz)) return;
    const cantt = W.inCantt(sx, sz), r = Math.random(); const kind = cantt ? (r < 0.22 ? 'soldier' : r < 0.3 ? 'mp' : r < 0.55 ? 'female' : 'civ') : (r < 0.035 ? 'police' : r < 0.25 ? 'worker' : r < 0.5 ? 'female' : 'civ');
    const p = new Ped(sx, sz, kind, null, { y: n.y }); p.side = side; const fwd = Math.random() < 0.5; p.setPath(fwd ? A : B, fwd ? B : A); p.heading = Math.atan2(fwd ? dx : -dx, fwd ? dz : -dz);
  }
  let spT = 0;
  N.update = function (dt, px, pz) {
    const hour = G.env.time, den = (hour < 5 ? 0.15 : hour < 7 ? 0.5 : hour < 21 ? 1 : hour < 23 ? 0.6 : 0.3) * (G.env.rain > 0.5 ? 0.5 : 1) * (N.density || 1);
    let amb = 0;
    for (let i = N.list.length - 1; i >= 0; i--) { const p = N.list[i]; p.update(dt); if (p.removed) continue; if (!p.keep && !p.dead) amb++; if (!p.keep && p.near > (p.cop && Wt.level > 0 ? 190 : 135)) p.remove(); }
    spT -= dt; if (spT <= 0) { spT = 0.15; if (amb < N.target * den && G.player.mode !== 'interior') spawnAmbient(px, pz); }
    // gate guards
    for (const g of W.checkpoints) { const d = Math.hypot(g.x - px, g.z - pz); if (d < 120 && !g.guards) { g.guards = []; for (const s of [-1, 1]) { const o = g.w / 2 + 2.6, x = g.x + Math.cos(g.a) * o * s + Math.sin(g.a) * 1.4, z = g.z - Math.sin(g.a) * o * s + Math.cos(g.a) * 1.4; if (W.buildingAt(x, z) >= 0) continue; const p = new Ped(x, z, g.g ? 'mp' : 'police', null, { state: 'guard' }); p.keep = true; p.gh = g.a + (s > 0 ? -1.2 : 1.2); p.heading = p.gh; g.guards.push(p); } } else if (d > 170 && g.guards) { for (const p of g.guards) if (!p.removed) p.remove(); g.guards = null; } }
    updatePickups(dt); Wt.update(dt);
  };
})();
