'use strict';
// Player controller: on foot, driving, riding buses and hired rides, interacting with the world.
(function () {
  const G = window.G, W = G.world, V = G.Veh, Wp = G.Weapons, I = G.interior, N = G.npc;
  const P = { x: 0, z: 0 }, tmp = {};
  const pl = G.player = { pos: { x: 0, y: 0, z: 0 }, vy: 0, heading: 0, speed: 0, mode: 'foot', vehicle: null, ride: null, health: 100, maxHealth: 100, armor: 0, money: 5000, bank: 20000, inv: { fist: { clip: 0, ammo: 0 } }, weapon: 'fist', aiming: false, armed: false, moving: false, cool: 0, reloadT: 0, punchT: 0, spreadAcc: 0, firedT: 0, medkits: 1, boostT: 0, dead: false, stepT: 0, grounded: true, mdx: 0, mdz: 1, hurtT: 0, ctl: { throttle: 0, steer: 0, handbrake: false } };
  pl.init = function (app) { if (pl.ch) pl.ch.dispose(); pl.ch = new G.Char.Character(app); G.scene.add(pl.ch.root); pl.selectWeapon(pl.weapon, true); };
  pl.give = function (id, quiet) { const d = Wp.DEFS[id]; if (!pl.inv[id]) pl.inv[id] = { clip: d.mag || 0, ammo: d.type === 'thrown' || d.type === 'heavy' ? 2 : (d.mag || 0) * 2 }; else if (d.mag) pl.inv[id].ammo += d.mag; if (!quiet) pl.selectWeapon(id); };
  pl.selectWeapon = function (id, quiet) { if (!pl.inv[id]) id = 'fist'; const d = Wp.DEFS[id]; pl.weapon = id; pl.reloadT = 0; pl.cool = 0.15; pl.ch.setGun(id === 'fist' ? null : Wp.mesh(id), d.long); pl.armed = d.type !== 'melee' && d.type !== 'thrown'; if (!quiet && G.audio) G.audio.click(); if (G.ui) G.ui.weaponChanged(); };
  pl.cycleWeapon = function (dir) { const own = Wp.ORDER.filter(id => pl.inv[id]); let i = own.indexOf(pl.weapon); i = (i + dir + own.length) % own.length; pl.selectWeapon(own[i]); };
  pl.damage = function (d, src) { if (pl.dead || pl.god || d <= 0) return; if (pl.armor > 0) { const a = Math.min(pl.armor, d * 0.75); pl.armor -= a; d -= a; } pl.health -= d; pl.hurtT = Math.min(1, pl.hurtT + 0.25 + d * 0.02); if (pl.health <= 0) { pl.health = 0; G.game.wasted(); } };
  pl.heal = function (n) { pl.health = Math.min(pl.maxHealth, pl.health + n); };
  pl.onCrash = function (v, veh) { G.fx.shake = Math.min(1, G.fx.shake + v / 16); if (veh.def.kind === 'bike') { if (v > 8) pl.damage((v - 6) * 4); if (v > 13 && pl.vehicle === veh) pl.exitVehicle(true); } else if (v > 13) pl.damage((v - 13) * 2); };
  pl.teleport = function (x, z, h, y) { pl.pos.x = x; pl.pos.z = z; pl.pos.y = y !== undefined ? y : W.groundY(x, z, 0.5); if (h !== undefined) pl.heading = h; pl.vy = 0; pl.speed = 0; };

  // ---------- vehicles ----------
  pl.enterVehicle = function (v) {
    if (v.dead) return;
    if (v.ai) { const a = v.ai; if (a.driver && !v.isBusRide) { const s = 1, x = v.x - v.fz * s * (v.def.W / 2 + 0.9), z = v.z + v.fx * s * (v.def.W / 2 + 0.9); const p = N.spawnAt(W.buildingAt(x, z) < 0 ? x : v.x + v.fz * (v.def.W / 2 + 0.9), W.buildingAt(x, z) < 0 ? z : v.z - v.fx * (v.def.W / 2 + 0.9), a.kind === 'soldier' || a.kind === 'police' ? a.kind : 'civ', { app: v.driverChar ? v.driverChar.app : null, y: v.y }); if (p.cop) { p.hostile = true; G.wanted.crime('cop', v.x, v.z); } else { p.state = 'flee'; p.t = 10; p.fx = v.x; p.fz = v.z; } G.wanted.crime('vehicle', v.x, v.z); G.ui.subtitle(p.cop ? 'Oi! Sarkari gari! Thamo!' : 'Arey! Amar gari! Chor! Chor!'); }
      if (v.driverChar) { v.driverChar.dispose(); v.driverChar = null; } v.ai = null; v.isBus = false; }
    else if (!v.owned && !v.stolen && !v.mission) { v.stolen = true; G.wanted.crime('theft', v.x, v.z); }
    if (v.parked) { v.parked = false; G.traffic.parked--; }
    v.driver = 'player'; v.sleep = false; pl.vehicle = v; pl.mode = 'vehicle'; pl.aiming = false;
    const s = v.geo.seats[0]; v.group.add(pl.ch.root); pl.ch.root.position.set(s[0], s[1], s[2]); pl.ch.root.rotation.set(0, 0, 0);
    if (Wp.DEFS[pl.weapon].long || Wp.DEFS[pl.weapon].type === 'melee') pl.ch.setGun(null);
    if (G.env.night > 0.35 || G.env.rain > 0.4) v.setLights(true);
    G.ui.bigLabel(v.def.name); if (G.audio) G.audio.cardoor(); G.cam.behindT = 0; if (G.game.onEnterVehicle) G.game.onEnterVehicle(v);
  };
  pl.exitVehicle = function (force) {
    const v = pl.vehicle; if (!v) return; const sp = Math.hypot(v.vx, v.vz);
    let ok = false, x, z; for (const [sx, sz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { x = v.x + v.fz * sx * (v.def.W / 2 + 0.8) + v.fx * sz * (v.def.L / 2 + 0.8); z = v.z - v.fx * sx * (v.def.W / 2 + 0.8) + v.fz * sz * (v.def.L / 2 + 0.8); if (W.buildingAt(x, z) < 0) { ok = true; break; } }
    if (!ok) { x = v.x; z = v.z; }
    G.scene.add(pl.ch.root); pl.pos.x = x; pl.pos.z = z; pl.pos.y = v.y; pl.heading = v.h; pl.vy = 0; pl.speed = 0; pl.mode = 'foot'; pl.vehicle = null; v.driver = null; v.brake = false; pl.selectWeapon(pl.weapon, true);
    if (sp > 6 || force) { pl.damage((sp - 4) * 2.2, null); pl.vy = 3; }
    if (G.audio) G.audio.cardoor(); if (G.game.onExitVehicle) G.game.onExitVehicle(v);
  };
  pl.boardRide = function (v, bus) { pl.ride = v; pl.mode = bus ? 'bus' : 'ride'; pl.aiming = false; pl.wantOff = false; const s = v.geo.seats[bus ? 2 : 1] || v.geo.seats[v.geo.seats.length - 1]; v.group.add(pl.ch.root); pl.ch.root.position.set(s[0], s[1], s[2]); pl.ch.root.rotation.set(0, 0, 0); pl.ch.root.visible = !bus; pl.ch.setGun(null); if (G.audio) G.audio.cardoor(); G.cam.behindT = 0; };
  pl.leaveRide = function (x, z) { const v = pl.ride; if (!v) return; if (x === undefined) { x = v.x + v.fz * (v.def.W / 2 + 1); z = v.z - v.fx * (v.def.W / 2 + 1); if (W.buildingAt(x, z) >= 0) { x = v.x - v.fz * (v.def.W / 2 + 1); z = v.z + v.fx * (v.def.W / 2 + 1); } } G.scene.add(pl.ch.root); pl.ch.root.visible = true; pl.pos.x = x; pl.pos.z = z; pl.pos.y = v.y; pl.heading = v.h; pl.mode = 'foot'; pl.ride = null; pl.speed = 0; pl.vy = 0; G.timeMul = 1; pl.selectWeapon(pl.weapon, true); if (v.ai && v.ai.hired) G.traffic.release(v); if (G.audio) G.audio.cardoor(); };

  // ---------- interaction search ----------
  const SERVICE = p => ({ title: p.n, sub: 'Workshop and service', items: [
    { label: 'Full repair', price: () => pl.vehicle ? Math.round(200 + (1 - pl.vehicle.health / pl.vehicle.def.hp) * 3000) : 0, desc: 'Fix all damage', fn: () => { const v = pl.vehicle; if (!v) return; const pr = Math.round(200 + (1 - v.health / v.def.hp) * 3000); if (pl.money < pr) return G.ui.notify('Not enough cash', '#e74c3c'); pl.money -= pr; v.health = v.def.hp; v.burn = 0; G.audio.buy(); G.ui.notify('Vehicle repaired', '#3fae5a'); } },
    { label: 'Respray', price: 2000, desc: 'New colour. Also loses a wanted level of up to 2 stars.', fn: () => { const v = pl.vehicle; if (!v) return; if (pl.money < 2000) return G.ui.notify('Not enough cash', '#e74c3c'); pl.money -= 2000; const c = G.pick(['#c0392b', '#2980b9', '#27ae60', '#f1c40f', '#8e44ad', '#e8e8e8', '#1b1b1d', '#e67e22', '#16a085', '#7f8c8d']); v.color = c; v.mPaint.material = V.paint(c, v.def.special); v.stolen = false; if (G.wanted.level <= 2 && G.wanted.seenT > 2) G.wanted.clear(); G.audio.buy(); G.ui.notify('Fresh paint job', '#3fae5a'); } }] });
  function doorAction(p) {
    const c = p.c;
    if (c === 'tea') return { label: 'Buy from ' + p.n, fn: () => G.ui.openMenu(I.MENU.tea(p)) };
    if (c === 'atm') return { label: 'Use ATM', fn: () => G.ui.openMenu(I.MENU.bank(p)) };
    if (c === 'garage' || c === 'fuel') return { label: p.n + ': drive a vehicle here for service', fn: () => G.ui.notify('Bring a vehicle to the road in front and press E') };
    if (c === 'vip') { if (!G.boysUnlocked) return { label: 'Private residence (Boys Club members only)', fn: () => G.ui.notify('Locked. Enter the Boys Club password from the pause menu.', '#c9a227') }; return { label: 'Enter ' + G.BOYS[+p.n].name + "'s " + (G.BOYS[+p.n].army ? 'bungalow' : 'duplex'), fn: () => G.game.enterInterior(p) }; }
    if (c === 'property' && !G.state.owned[p.id]) { const price = 250000 + (G.hash(p.id) % 8) * 120000; return { label: 'Buy ' + p.n + ' for ' + G.taka(price), fn: () => { if (pl.money < price) return G.ui.notify('You need ' + G.taka(price) + ' in cash. Withdraw from a bank.', '#e74c3c'); pl.money -= price; G.state.owned[p.id] = 1; G.audio.mission(true); G.ui.notify('Property purchased! New safehouse unlocked.', '#3fae5a'); G.props.refreshSigns(); } }; }
    const nm = c === 'house' ? (p.n || 'Residence') : p.n;
    return { label: 'Enter ' + nm, fn: () => G.game.enterInterior(p) };
  }
  pl.findInteract = function () {
    let E = null, F = null; const px = pl.pos.x, pz = pl.pos.z;
    if (pl.mode === 'interior') { let bd = 1e9; for (const s of I.spots) { const d = Math.hypot(s.x - px, s.z - pz); if (d < s.r && d < bd) { bd = d; E = { label: s.label, fn: s.fn }; } } return { E, F }; }
    if (pl.mode === 'vehicle') { const v = pl.vehicle; F = { label: null }; if (Math.abs(v.speed) < 3) for (const p of G.props.near) { if ((p.c === 'garage' || p.c === 'fuel') && p.rx !== null && Math.hypot(p.rx - px, p.rz - pz) < 11) { E = { label: p.n + ': repair and respray', fn: () => G.ui.openMenu(SERVICE(p)) }; break; } } return { E, F }; }
    if (pl.mode !== 'foot') return { E, F };
    // vehicles
    let bv = null, bd = 3.0; for (const v of V.list) { if (v.dead || Math.abs(v.y - pl.pos.y) > 2) continue; const rx = px - v.x, rz = pz - v.z; if (Math.abs(rx) > 9 || Math.abs(rz) > 9) continue; const lx = Math.abs(rx * v.fz - rz * v.fx) - v.def.W / 2, lz = Math.abs(rx * v.fx + rz * v.fz) - v.def.L / 2, d = Math.hypot(Math.max(0, lx), Math.max(0, lz)); if (d < bd) { bd = d; bv = v; } }
    if (bv && bd < 1.7) { F = { label: (bv.ai && bv.ai.driver ? 'Steal ' : 'Enter ') + bv.def.name, fn: () => pl.enterVehicle(bv) };
      if (bv.ai && bv.ai.bus && bv.ai.bus.dwell > 0) { const B = bv.ai.bus, nxt = B.stops[(B.si + 1) % B.stops.length]; E = { label: 'Board ' + bv.routeName + ' bus (৳20), next stop ' + (nxt ? nxt.n : ''), fn: () => { if (pl.money < 20) return G.ui.notify('Bus fare is ৳20'); pl.money -= 20; pl.boardRide(bv, true); G.ui.notify('Press E to get off at the next stop. Hold Space to fast forward.'); } }; }
      else if (bv.ai && bv.ai.driver && !bv.ai.chase && !bv.ai.hired && (bv.id === 'cng' || bv.id === 'taxi' || bv.id === 'rickshaw') && Math.abs(bv.speed) < 4) { const wp = G.ui.waypoint; if (!wp) E = { label: 'Hire ' + bv.def.name + ' (set a waypoint on the map first, press M)', fn: () => G.ui.notify('Open the map with M and click a destination') }; else { const dist = Math.hypot(wp.x - px, wp.z - pz), fare = Math.round((bv.id === 'rickshaw' ? 20 : 40) + dist * (bv.id === 'taxi' ? 0.09 : bv.id === 'rickshaw' ? 0.05 : 0.06)); if (bv.id === 'rickshaw' && dist > 1500) E = { label: 'Rickshaw: too far, mama jabe na', fn: () => G.ui.subtitle('Oto dure jabo na mama!') }; else E = { label: `Hire ${bv.def.name} to waypoint (${G.taka(fare)})`, fn: () => { if (pl.money < fare) return G.ui.notify('Not enough cash for the fare'); if (!G.traffic.hire(bv, wp.x, wp.z)) return G.ui.subtitle('Oi dike jabo na bhai.'); pl.fare = fare; pl.boardRide(bv, false); G.ui.subtitle(bv.id === 'rickshaw' ? 'Uthun mama, cholen.' : 'Bosen bhai, jacchi.'); G.ui.notify('Hold Space to fast forward. Press F to get off early.'); } }; } } }
    if (!E) for (const p of G.props.near) { if (p.c === 'gate') continue; if (p.c === 'bus') { if (Math.hypot(p.sx - px, p.sz - pz) < 3.2) { E = { label: p.n + ' bus stop: wait for a bus', fn: () => { if (!p.routes) return G.ui.notify('No bus line serves this stop'); const b = G.traffic.callBus(p); G.ui.notify(b ? G.traffic.routes[p.routes[0]].name + ' bus is on its way. Board with E when it stops.' : 'No bus right now, try again shortly'); } }; break; } continue; }
      const dx = p.x + Math.sin(p.a) * 0.9 - px, dz = p.z + Math.cos(p.a) * 0.9 - pz; if (dx * dx + dz * dz < 2.9) { E = doorAction(p); break; } }
    return { E, F };
  };

  // ---------- updates ----------
  function vehiclePush() {
    const px = pl.pos.x, pz = pl.pos.z;
    for (const v of V.list) { const rx = px - v.x, rz = pz - v.z; if (Math.abs(rx) > 8 || Math.abs(rz) > 8 || pl.pos.y > v.y + v.def.H || pl.pos.y < v.y - 1) continue; const c = Math.cos(v.h), s = Math.sin(v.h); let lx = rx * c - rz * s, lz = rx * s + rz * c; const hw = v.def.W / 2 + 0.3, hl = v.def.L / 2 + 0.3; if (Math.abs(lx) >= hw || Math.abs(lz) >= hl) continue;
      const sp = Math.hypot(v.vx, v.vz); if (sp > 3.5 && v.driver !== 'player') { pl.damage(sp * 3.2, v); pl.vy = 3.5; if (G.audio) G.audio.thud(); }
      if (hw - Math.abs(lx) < hl - Math.abs(lz)) lx = (lx < 0 ? -1 : 1) * hw; else lz = (lz < 0 ? -1 : 1) * hl; pl.pos.x = v.x + lx * c + lz * s; pl.pos.z = v.z - lx * s + lz * c; }
  }
  function footUpdate(dt, interior) {
    const In = G.input, cam = G.cam, block = G.ui.blocking, def = Wp.DEFS[pl.weapon];
    const fw = block ? 0 : (In.keys.KeyW || In.keys.ArrowUp ? 1 : 0) - (In.keys.KeyS || In.keys.ArrowDown ? 1 : 0), st = block ? 0 : (In.keys.KeyD ? 1 : 0) - (In.keys.KeyA ? 1 : 0);
    const cy = cam.yaw, fx = Math.sin(cy), fz = Math.cos(cy), rx = -fz, rz = fx; let mx = fx * fw + rx * st, mz = fz * fw + rz * st; const ml = Math.hypot(mx, mz); pl.moving = ml > 0.1;
    pl.aiming = !!In.mb[2] && !block && In.locked; const wading = !interior && pl.pos.y < 0.1 && W.inWater(pl.pos.x, pl.pos.z);
    const sprint = In.keys.ShiftLeft && !pl.aiming && fw > 0;
    let target = pl.moving ? (pl.aiming ? 1.9 : sprint ? (pl.boostT > 0 ? 7.9 : 6.3) : In.keys.AltLeft || In.keys.KeyC ? 1.5 : 3.6) : 0; if (wading) target *= 0.4;
    pl.speed = G.damp(pl.speed, target, 10, dt); if (pl.boostT > 0) pl.boostT -= dt;
    if (pl.moving) { pl.mdx = mx / ml; pl.mdz = mz / ml; }
    const face = (pl.aiming || pl.firedT > 0) ? cy : pl.moving ? Math.atan2(pl.mdx, pl.mdz) : pl.heading; pl.heading = G.angLerp(pl.heading, face, 1 - Math.exp(-(pl.aiming ? 20 : 11) * dt));
    if (pl.speed > 0.05) { pl.pos.x += pl.mdx * pl.speed * dt; pl.pos.z += pl.mdz * pl.speed * dt; }
    const ground = interior ? 0 : W.groundY(pl.pos.x, pl.pos.z, pl.pos.y);
    if (pl.grounded && In.hit.Space && !interior && !block) { pl.vy = 5.3; pl.grounded = false; }
    pl.vy -= 16 * dt; pl.pos.y += pl.vy * dt; if (pl.pos.y <= ground) { if (pl.vy < -11.5) pl.damage((-pl.vy - 11) * 7, null); pl.pos.y = ground; pl.vy = 0; pl.grounded = true; } else if (pl.pos.y > ground + 0.08) pl.grounded = false;
    P.x = pl.pos.x; P.z = pl.pos.z; if (interior) I.collide(P, 0.3); else { W.collide(P, 0.32, pl.pos.y); const b = W.bounds; if (P.x < b.minX + 3 || P.x > b.maxX - 3 || P.z < b.minZ + 3 || P.z > b.maxZ - 3) { P.x = G.clamp(P.x, b.minX + 3, b.maxX - 3); P.z = G.clamp(P.z, b.minZ + 3, b.maxZ - 3); G.ui.prompt('Edge of the map. Turn back towards Dhaka Cantonment.'); } }
    pl.pos.x = P.x; pl.pos.z = P.z; if (!interior) vehiclePush();
    // melee
    if (pl.punchT > 0) { pl.punchT -= dt; if (!pl.punchHit && pl.punchT < 0.24) { pl.punchHit = true; const hx = Math.sin(pl.heading), hz = Math.cos(pl.heading); let best = null, bd = def.id === 'bat' ? 2.1 : 1.6; if (!interior) for (const p of N.list) { if (p.dead) continue; const dx = p.x - pl.pos.x, dz = p.z - pl.pos.z, d = Math.hypot(dx, dz); if (d < bd && (dx * hx + dz * hz) / (d || 1) > 0.35) { bd = d; best = p; } } if (best) { best.hit(def.dmg, 'body', hx, hz, 'player'); if (best.hp < 45 || def.id === 'bat') best.knock(hx * 3.5, hz * 3.5, 0, 'player'); G.audio.thud(); G.fx.shake = 0.15; } else if (!interior) for (const v of V.list) { const dx = v.x - pl.pos.x, dz = v.z - pl.pos.z; if (Math.hypot(dx, dz) < v.R + 0.8) { v.damage(def.dmg * 0.4); G.audio.crash(0.25, 0); break; } } } }
    if (interior) { pl.cool -= dt; pl.firedT = 0; if (In.mhit[0] && In.locked && !block && def.type !== 'melee' && (pl.msgT || 0) < G.time) { pl.msgT = G.time + 3; G.ui.notify(I.peace ? 'Not here. Show some respect.' : 'Aim at the shopkeeper (hold right mouse) to rob the place.'); } if (I.peace) pl.aiming = false; }
    else Wp.playerUpdate(dt, pl, !block && In.locked);
    pl.ch.update(dt, { speed: pl.speed, run: pl.speed > 4.6, air: !pl.grounded && pl.pos.y > ground + 0.25, aim: pl.aiming || pl.firedT > 0, pitch: cam.pitch, armed: pl.armed ? (def.long ? 2 : 1) : 0, fists: def.type === 'melee', punch: pl.punchT > 0 ? 1 - pl.punchT / 0.42 : 0 });
    const r = pl.ch.root; r.position.set(pl.pos.x, pl.pos.y - (wading ? 0.75 : 0), pl.pos.z); r.rotation.set(0, pl.heading, 0);
    if (pl.speed > 0.5 && pl.grounded) { pl.stepT -= dt * pl.speed; if (pl.stepT <= 0) { pl.stepT = pl.speed > 4.6 ? 2.1 : 1.45; if (wading) G.audio.splash(); else G.audio.step(!interior && G.env.wet > 0.4, pl.speed > 4.6); } }
    if (In.hit.KeyH && !block && pl.medkits > 0 && pl.health < pl.maxHealth) { pl.medkits--; pl.heal(60); G.audio.pickup(); G.ui.notify('Used a first aid kit. ' + pl.medkits + ' left.'); }
  }
  function vehicleUpdate(dt) {
    const v = pl.vehicle, In = G.input, block = G.ui.blocking, c = pl.ctl;
    c.throttle = block ? 0 : (In.keys.KeyW || In.keys.ArrowUp ? 1 : 0) - (In.keys.KeyS || In.keys.ArrowDown ? 1 : 0); c.steer = block ? 0 : (In.keys.KeyA || In.keys.ArrowLeft ? 1 : 0) - (In.keys.KeyD || In.keys.ArrowRight ? 1 : 0); c.handbrake = !block && !!In.keys.Space;
    v.near = 0; v.update(dt, c); pl.pos.x = v.x; pl.pos.y = v.y; pl.pos.z = v.z; pl.heading = v.h; pl.speed = Math.abs(v.speed);
    if (!block) { if (In.hit.KeyL) v.setLights(!v.lights); if (In.hit.KeyH) { G.audio.horn(0, v.def.kind === 'bus' || v.def.kind === 'truck' ? 'bus' : v.id === 'rickshaw' ? 'rickshaw' : v.id === 'cng' ? 'cng' : 'player'); N.alarmHorn && N.alarmHorn(); } if (In.hit.KeyQ && v.mBarA) v.siren = !v.siren; }
    const def = Wp.DEFS[pl.weapon]; pl.aiming = false;
    if (!block && In.locked && (def.type === 'pistol' || def.type === 'smg') && v.def.kind !== 'bus') Wp.playerUpdate(dt, pl, true); else { pl.cool -= dt; pl.firedT = 0; }
    pl.ch.update(dt, { pose: v.geo.pose || 'drive', steer: v.steer / 0.6, speed: Math.abs(v.speed) });
    if (v.slip > 3.5 && pl.speed > 5 && v.y <= v.gy + 0.05) { if (Math.random() < dt * 30) G.fx.tyre(v.x - v.fx * v.def.wb * 0.5, v.y + 0.1, v.z - v.fz * v.def.wb * 0.5); }
    if (v.inWater && (pl.wetMsg || 0) < G.time) { pl.wetMsg = G.time + 6; G.ui.notify('The engine is flooding! Get out of the water.'); v.damage(40, true); }
  }
  function rideUpdate(dt) {
    const v = pl.ride, In = G.input; if (!v || v.removed || v.dead || !v.ai) { if (v && !v.removed) pl.leaveRide(); else { pl.mode = 'foot'; pl.ride = null; G.scene.add(pl.ch.root); pl.ch.root.visible = true; G.timeMul = 1; } return; }
    pl.pos.x = v.x; pl.pos.y = v.y; pl.pos.z = v.z; pl.heading = v.h; pl.speed = Math.abs(v.speed); pl.ch.update(dt, { pose: 'sit' });
    G.timeMul = In.keys.Space && !G.ui.blocking ? 3.5 : 1;
    if (pl.mode === 'bus') { const B = v.ai.bus; if (In.hit.KeyE) { pl.wantOff = !pl.wantOff; G.ui.notify(pl.wantOff ? 'You will get off at the next stop' : 'Staying on the bus'); } const st = B.stops[B.si % B.stops.length]; G.ui.prompt((pl.wantOff ? 'Getting off at: ' : 'Next stop: ') + (st ? st.n : '') + '   [E] ' + (pl.wantOff ? 'stay on' : 'get off at next stop') + '   [Space] fast forward'); if (B.dwell > 0 && pl.wantOff && B.atStop) { const s = B.atStop; pl.leaveRide(s.sx + Math.sin(s.a) * 1.2, s.sz + Math.cos(s.a) * 1.2); G.ui.notify('Arrived at ' + s.n); } if (In.hit.KeyF) { pl.leaveRide(); } }
    else { const a = v.ai, wp = G.ui.waypoint; G.ui.prompt('Riding to waypoint   [Space] fast forward   [F] get off here'); const arrived = a.done || (wp && Math.hypot(wp.x - v.x, wp.z - v.z) < 22); if (arrived || In.hit.KeyF) { const fare = arrived ? pl.fare : Math.round(pl.fare * 0.6); pl.money = Math.max(0, pl.money - fare); a.hold = 2.5; pl.leaveRide(); G.ui.notify('Paid ' + G.taka(fare) + ' fare', '#3fae5a'); if (arrived) G.ui.setWaypoint(null); G.audio.buy(); } }
  }
  pl.update = function (dt) {
    if (pl.hurtT > 0) pl.hurtT = Math.max(0, pl.hurtT - dt * 0.6);
    if (pl.dead) { pl.ch.update(dt, { pose: 'dead' }); return; }
    if (pl.mode === 'foot') footUpdate(dt, false); else if (pl.mode === 'interior') footUpdate(dt, true); else if (pl.mode === 'vehicle') vehicleUpdate(dt); else rideUpdate(dt);
    // interaction prompts
    pl.intT = (pl.intT || 0) - dt; if (pl.intT <= 0) { pl.intT = 0.1; pl.int = pl.findInteract(); }
    const it = pl.int, In = G.input; if (!it || G.ui.blocking) return;
    if (pl.mode === 'foot' || pl.mode === 'interior') { const parts = []; if (it.E) parts.push('[E] ' + it.E.label); if (it.F && it.F.label) parts.push('[F] ' + it.F.label); if (parts.length) G.ui.prompt(parts.join('     ')); }
    else if (pl.mode === 'vehicle' && it.E) G.ui.prompt('[E] ' + it.E.label);
    if (In.hit.KeyE && it.E && pl.mode !== 'bus' && pl.mode !== 'ride') { it.E.fn(); pl.intT = 0; }
    if (In.hit.KeyF) { if (pl.mode === 'vehicle') pl.exitVehicle(); else if (pl.mode === 'foot' && it.F && it.F.fn) it.F.fn(); pl.intT = 0; }
  };
})();
