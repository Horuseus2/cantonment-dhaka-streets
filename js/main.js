'use strict';
// Boot, renderer + post-processing, camera, main loop.
(function () {
  const G = window.G, W = G.world, U = G.ui, pl = G.player, I = G.interior, E = G.env, V3 = THREE.Vector3;
  const q = new URLSearchParams(location.search);
  G.time = 0; G.timeMul = 1; G.running = false;
  G.settings = Object.assign({ quality: 1, volume: 0.8, sens: 1, traffic: 1, peds: 1, invert: false }, (() => { try { return JSON.parse(localStorage.getItem('ds_settings')) || {}; } catch (e) { return {}; } })());
  if (q.get('q')) G.settings.quality = +q.get('q');
  G.saveSettings = () => { try { localStorage.setItem('ds_settings', JSON.stringify(G.settings)); } catch (e) { } };
  window.addEventListener('error', e => { const d = document.getElementById('err'); if (d) d.textContent = (e.message || '') + '\n' + (e.filename || '').split('/').pop() + ':' + e.lineno; });

  const FINAL = { uniforms: { tDiffuse: { value: null }, uExposure: { value: 1 }, uVig: { value: 0.55 }, uTime: { value: 0 }, uHurt: { value: 0 }, uSat: { value: 1.08 }, uWet: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uExposure,uVig,uTime,uHurt,uSat,uWet; varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.,1.); }
      void main(){ vec3 c = texture2D(tDiffuse,vUv).rgb * uExposure; c = aces(c);
        float l = dot(c, vec3(0.2126,0.7152,0.0722)); c = mix(vec3(l), c, uSat); c = mix(c, c*vec3(0.92,0.98,1.06), uWet*0.5);
        c = pow(c, vec3(1./2.2)); vec2 p = vUv-0.5; c *= 1. - dot(p,p)*uVig;
        c += (fract(sin(dot(vUv*vec2(1920.,1080.)+uTime, vec2(12.9898,78.233)))*43758.5453)-0.5)*0.014;
        c = mix(c, vec3(0.55,0.,0.), uHurt * smoothstep(0.25,0.75,length(p)));
        gl_FragColor = vec4(c,1.); }` };

  let renderer, camera, composer, renderPass, bloom, finalPass, last = performance.now();
  const cam = G.cam = { yaw: 0, pitch: -0.1, pos: new V3(0, 30, 0), dir: new V3(0, 0, 1), mode: 0, behindT: 0, front: false, kick(r) { cam.pitch += r; cam.yaw += (Math.random() - 0.5) * r * 0.8; } };
  const focus = new V3(), tgt = new V3(), des = new V3(), look = new V3();

  G.applySettings = function () {
    const s = G.settings, ql = G.quality = s.quality; const pr = ql === 0 ? 0.8 : ql === 1 ? Math.min(devicePixelRatio || 1, 1.25) : Math.min(devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight); if (composer) { composer.setPixelRatio(pr); composer.setSize(innerWidth, innerHeight); }
    E.sun.castShadow = ql > 0; renderer.shadowMap.enabled = ql > 0; const ms = ql === 2 ? 4096 : 2048; if (E.sun.shadow.mapSize.x !== ms) { E.sun.shadow.mapSize.set(ms, ms); if (E.sun.shadow.map) { E.sun.shadow.map.dispose(); E.sun.shadow.map = null; } } E.setShadowRange(ql === 2 ? 120 : 90);
    W.viewDist = ql === 0 ? 520 : ql === 1 ? 850 : 1150; W.propDist = ql === 0 ? 260 : ql === 1 ? 440 : 600; G.traffic.target = ql === 0 ? 14 : ql === 1 ? 22 : 28; G.traffic.density = s.traffic; G.npc.target = ql === 0 ? 14 : ql === 1 ? 24 : 32; G.npc.density = s.peds; G.audio.setVol(s.volume);
    renderer.toneMapping = composer && ql > 0 ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping; camera.far = ql === 0 ? 2600 : 5000; camera.updateProjectionMatrix();
  };
  G.preload = function (x, z) { let n = 0; W.update(x, z, 40); while (W.queue.length && n++ < 400) { const before = W.queue.length; W.update(x, z, 40); if (W.queue.length === before && before > 0) { /* nearest ring only */ if (W.queue.every(c => c[0] > 380)) break; } } };

  async function boot() {
    renderer = G.renderer = new THREE.WebGLRenderer({ antialias: G.settings.quality === 0, powerPreference: 'high-performance' });
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game').appendChild(renderer.domElement); G.maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const scene = G.scene = G.activeScene = new THREE.Scene(); camera = G.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.16, 5000);
    const hl = G.headlight = new THREE.SpotLight(0xfff0d8, 0, 75, 0.52, 0.7, 1.2); scene.add(hl); scene.add(hl.target);
    U.init(); G.boys.load();
    const tips = ['Bangladesh drives on the left. So does everyone here, mostly.', 'Every road, building and bus stop comes from the real map of Dhaka Cantonment.', 'Thousands of doors can be entered: stores, restaurants, mosques, banks, homes.', 'Hire a CNG or rickshaw: set a waypoint on the map, then press E next to one.', 'Monsoon rain makes the roads slippery. Kalboishakhi storms bring lightning.', 'Firing a weapon inside the Cantonment brings the Military Police fast.'];
    document.getElementById('loadtip').textContent = tips[(Math.random() * tips.length) | 0];
    const prog = (p, t) => U.loading(p, t);
    prog(0.02, 'Painting textures'); await G.frame(); await G.frame(); G.initTextures();
    await W.init(scene, prog);
    G.estate.init(scene); G.cloud.connect();
    prog(0.38, 'Planting trees and street lights'); await G.frame(); G.props.init(scene);
    prog(0.5, 'Setting up sky and weather'); await G.frame(); E.init(scene, renderer); I.init(); G.fx.init(scene); G.Weapons.init(); G.Veh.initMats();
    prog(0.62, 'Drawing the map'); await G.frame(); U.buildBase();
    prog(0.74, 'Planning bus routes'); await G.frame(); G.traffic.initRoutes();
    // post processing
    try { const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 }); composer = new THREE.EffectComposer(renderer, rt); renderPass = new THREE.RenderPass(scene, camera); composer.addPass(renderPass); bloom = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.4, 0.55, 1.0); composer.addPass(bloom); finalPass = new THREE.ShaderPass(FINAL); composer.addPass(finalPass); } catch (e) { composer = null; console.warn('post fx off', e); }
    pl.init(G.Char.defaultApp()); G.applySettings();
    prog(0.82, 'Building the neighbourhood'); await G.frame();
    const home = W.pois.find(p => p.c === 'home'), gate = W.checkpoints.find(c => /Jahangir/.test(c.n)) || { x: home.x, z: home.z };
    G.menuSpot = { x: home.x, z: home.z }; pl.teleport(home.x + Math.sin(home.a) * 2, home.z + Math.cos(home.a) * 2, home.a); G.preload(pl.pos.x, pl.pos.z);
    prog(1, 'Ready'); await G.frame();
    document.getElementById('loading').classList.add('hidden');
    addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); G.applySettings(); });
    renderer.domElement.addEventListener('click', () => { G.audio.init(); if (G.running && !U.blocking) U.lock(); });
    document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && G.running && !U.blocking && !G.game.busy && !pl.dead && !q.get('auto')) setTimeout(() => { if (!document.pointerLockElement && G.running && !U.blocking && !G.game.busy) U.pause(true); }, 60); });
    U.showMainMenu(true);
    if (q.get('auto')) { G.game.quickStart(); if (q.get('t')) G.env.time = +q.get('t'); if (q.get('w')) G.env.setWeather(q.get('w'), true); }
    window.DONE = true; requestAnimationFrame(frame);
  }

  function camUpdate(dt) {
    const In = G.input, s = G.settings.sens * 0.0022, interior = pl.mode === 'interior';
    if (!G.running) { const t = performance.now() * 0.00004, c = G.menuSpot; cam.pos.set(c.x + Math.cos(t) * 70, 34, c.z + Math.sin(t) * 70); look.set(c.x, 6, c.z); cam.dir.copy(look).sub(cam.pos).normalize(); camera.position.copy(cam.pos); camera.lookAt(look); camera.fov = 55; camera.updateProjectionMatrix(); focus.set(c.x, 0, c.z); return; }
    if (In.locked && !U.blocking && !U.wheelOpen) { const k = U.scoped ? 0.22 : pl.aiming ? 0.7 : 1; cam.yaw -= In.mdx * s * k; cam.pitch -= In.mdy * s * k * (G.settings.invert ? -1 : 1); if (In.mdx || In.mdy) cam.behindT = 2.2; }
    if (!In.locked && !U.blocking && pl.mode === 'foot') { cam.yaw += ((In.keys.ArrowLeft ? 1 : 0) - (In.keys.ArrowRight ? 1 : 0)) * dt * 1.8; }
    cam.pitch = G.clamp(cam.pitch, -1.15, 1.2);
    let dist, side = 0, fov = 62; const h = pl.ch.h || 1;
    if (cam.front) { if (!U.menu) pl.heading += ((In.keys.KeyA ? 1 : 0) - (In.keys.KeyD ? 1 : 0)) * dt * 2.4; cam.yaw = cam.frontYaw; cam.pitch = -0.05; const fr = -Math.cos(cam.yaw), fzr = Math.sin(cam.yaw); tgt.set(pl.pos.x + fr * 0.62, pl.pos.y + 1.08 * h, pl.pos.z + fzr * 0.62); dist = 3.5; fov = 40; }
    else if (pl.mode === 'foot' || interior) { tgt.set(pl.pos.x, pl.pos.y + 1.56 * h, pl.pos.z); const aim = pl.aiming || pl.firedT > 0.2; dist = aim ? 1.75 : interior ? 3.1 : 3.9; side = aim ? 0.52 : 0.28; if (U.scoped) { dist = -0.3; side = 0; fov = 13; } else if (aim) fov = 54; if (pl.dead) { cam.yaw += dt * 0.3; dist = 5; cam.pitch = G.damp(cam.pitch, -0.5, 2, dt); } }
    else { const v = pl.vehicle || pl.ride, d = v.def; if (In.hit.KeyV) cam.mode = (cam.mode + 1) % 3; cam.behindT -= dt; const rev = v.speed < -1.5; if (cam.behindT <= 0 && Math.abs(v.speed) > 1.5 && !U.blocking) { cam.yaw = G.angLerp(cam.yaw, v.h + (rev ? Math.PI : 0), 1 - Math.exp(-2.6 * dt)); cam.pitch = G.damp(cam.pitch, -0.13, 1.5, dt); }
      if (cam.mode === 2) { tgt.set(v.x + v.fx * (d.L * 0.12), v.y + d.H * 0.78, v.z + v.fz * (d.L * 0.12)); dist = -0.4; } else { tgt.set(v.x, v.y + d.H * 0.72 + 0.55, v.z); dist = (d.L * 0.85 + 3.3) * (cam.mode === 1 ? 1.7 : 1) + Math.abs(v.speed) * 0.035; } fov = 62 + Math.min(16, Math.abs(v.speed) * 0.3); }
    const cp = Math.cos(cam.pitch); cam.dir.set(Math.sin(cam.yaw) * cp, Math.sin(cam.pitch), Math.cos(cam.yaw) * cp);
    const rx = -Math.cos(cam.yaw), rz = Math.sin(cam.yaw); des.set(tgt.x - cam.dir.x * dist + rx * side, tgt.y - cam.dir.y * dist + 0.12, tgt.z - cam.dir.z * dist + rz * side);
    // keep the camera out of walls
    if (interior) { const b = I.bounds; let k = 1; const dx = des.x - tgt.x, dy = des.y - tgt.y, dz = des.z - tgt.z, m = 0.25; if (dx > 0 && des.x > b.x1 + m) k = Math.min(k, (b.x1 + m - tgt.x) / dx); if (dx < 0 && des.x < b.x0 - m) k = Math.min(k, (b.x0 - m - tgt.x) / dx); if (dz > 0 && des.z > b.z1 + m) k = Math.min(k, (b.z1 + m - tgt.z) / dz); if (dz < 0 && des.z < b.z0 - m) k = Math.min(k, (b.z0 - m - tgt.z) / dz); if (dy > 0 && des.y > b.h - 0.2) k = Math.min(k, (b.h - 0.2 - tgt.y) / dy); if (des.y < 0.2) k = Math.min(k, (0.2 - tgt.y) / dy); k = Math.max(0.08, k); des.set(tgt.x + dx * k, tgt.y + dy * k, tgt.z + dz * k); }
    else if (dist > 0) { let dx = des.x - tgt.x, dy = des.y - tgt.y, dz = des.z - tgt.z; const len = Math.hypot(dx, dy, dz); dx /= len; dy /= len; dz /= len; const d = W.ray(tgt.x, tgt.y, tgt.z, dx, dy, dz, len + 0.3); if (d < len + 0.3) { const k = Math.max(0.35, d - 0.3); des.set(tgt.x + dx * k, Math.max(0.25, tgt.y + dy * k), tgt.z + dz * k); } if (des.y < 0.25) des.y = 0.25; }
    const sh = G.fx.shake; if (sh > 0.01) { des.x += (Math.random() - 0.5) * sh * 0.3; des.y += (Math.random() - 0.5) * sh * 0.3; }
    cam.pos.copy(des); camera.position.copy(des); look.copy(des).add(cam.dir); camera.lookAt(look);
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = G.damp(camera.fov, fov, 9, dt); camera.updateProjectionMatrix(); }
    focus.set(pl.pos.x + cam.dir.x * 22, pl.pos.y, pl.pos.z + cam.dir.z * 22);
  }

  let slow = 0;
  function sim(dt) {
    const interior = pl.mode === 'interior';
    pl.update(dt);
    if (!interior) { const px = pl.pos.x, pz = pl.pos.z; G.traffic.update(dt, px, pz); G.npc.update(dt, px, pz); G.Weapons.update(dt); } else { I.update(dt); G.wanted.seenT += dt; if (G.net.active) for (const r of G.net.remotes.values()) r.update(dt); }
    G.estate.update(dt);
    G.fx.update(dt); G.game.update(dt);
  }
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = Math.min(0.05, (now - last) / 1000); last = now; if (dt <= 0) dt = 0.016;
    const In = G.input;
    if (G.running) {
      if (In.hit.KeyM && !U.menu && !U.ward && !U.paused && !U.boysOpen) U.toggleMap();
      if (In.hit.Escape || In.hit.KeyP) { if (U.mapOpen) U.toggleMap(false); else if (!U.menu && !U.ward && !U.boysOpen && !(In.hit.KeyP && document.activeElement && document.activeElement.tagName === 'INPUT')) U.pause(!U.paused); }
      if (In.hit.F5) { if (G.game.save(true)) U.notify('Game saved', '#58d26b'); }
      if (!U.blocking && !U.wheelOpen && (pl.mode === 'foot' || pl.mode === 'vehicle')) { if (In.wheel) pl.cycleWeapon(In.wheel > 0 ? 1 : -1); for (let i = 1; i <= 9; i++) if (In.hit['Digit' + i]) { const own = G.Weapons.ORDER.filter(id => pl.inv[id]); if (own[i - 1]) pl.selectWeapon(own[i - 1]); } }
    }
    const wheel = U.update(dt);
    const interior = pl.mode === 'interior';
    const online = G.net.active; if (online) G.net.update(dt);
    if (G.running && ((!U.paused && !U.mapOpen) || online)) {
      const mul = (wheel ? 0.25 : 1) * (G.timeMul || 1) * (pl.dead ? 0.5 : 1); let sdt = dt * mul; G.time += sdt; const n = Math.max(1, Math.ceil(sdt / 0.034)); for (let i = 0; i < n; i++) sim(sdt / n);
      E.warp = G.timeMul > 1 ? G.timeMul : 1;
    } else if (!G.running) { G.time += dt; G.traffic.update(dt, G.menuSpot.x, G.menuSpot.z); G.npc.update(dt, G.menuSpot.x, G.menuSpot.z); }
    camUpdate(dt);
    if (!interior) { const fx = G.running ? pl.pos.x : G.menuSpot.x, fz = G.running ? pl.pos.z : G.menuSpot.z; W.update(fx, fz, 1); G.props.update(dt, fx, fz, E.night, G.time); }
    E.update(U.paused && !online ? 0 : dt * (G.timeMul > 1 ? G.timeMul : 1), camera, focus, interior);
    slow += dt; if (slow > 0.25) { slow = 0; W.setNight(E.night); W.setWet(E.wet); W.waterNormal2.offset.x += 0.004; W.waterNormal2.offset.y += 0.0025; }
    W.waterNormal2.offset.x += dt * 0.012; W.waterNormal2.offset.y += dt * 0.007;
    { const hv = pl.vehicle, hl = G.headlight; if (hv && hv.lights && !hv.dead && !interior) { hl.intensity = 1.2 + E.night * 2.6; hl.position.set(hv.x + hv.fx * hv.def.L * 0.45, hv.y + 0.75, hv.z + hv.fz * hv.def.L * 0.45); hl.target.position.set(hv.x + hv.fx * 30, hv.y - 0.4, hv.z + hv.fz * 30); } else hl.intensity = 0; }
    // audio
    const v = pl.vehicle || pl.ride; let siren = 0; if (G.Veh.sirenAny) { let nd = 999; for (const o of G.Veh.list) if (o.siren && !o.dead) nd = Math.min(nd, o.near); siren = G.clamp(1.2 - nd / 160, 0, 1); }
    G.audio.update(dt, { paused: (U.paused && !online) || !G.running, engine: G.running && !!v && !v.dead && (pl.mode === 'vehicle' || pl.mode === 'ride' || pl.mode === 'bus' || pl.mode === 'mpride'), rpm: v ? G.clamp(Math.abs(v.speed) / v.def.max, 0, 1) * 0.75 + ((Math.abs(v.speed) * 0.35) % 1) * 0.12 : 0, load: v && pl.mode === 'vehicle' ? Math.abs(pl.ctl.throttle) : 0.3, kind: v ? (v.id === 'rickshaw' ? 'rickshaw' : v.def.kind === 'car' && v.def.max > 60 ? 'bike' : v.def.kind) : 'car', skid: v && pl.mode === 'vehicle' ? (v.slip - 2.5) / 6 : 0, rain: E.rain, wind: E.wind, speed: pl.speed, night: E.night, indoors: interior, siren: interior ? 0 : siren });
    // render
    const sc = G.activeScene; renderer.toneMappingExposure = interior ? 1.05 : E.exposure;
    if (composer && G.quality > 0) { renderPass.scene = sc; bloom.threshold = interior ? 1.0 : E.bloomThreshold; bloom.strength = interior ? 0.3 : E.bloomStrength; const u = finalPass.uniforms; u.uExposure.value = interior ? 1.05 : E.exposure; u.uTime.value = now * 0.001; u.uHurt.value = pl.hurtT * 0.8 + (pl.health < 25 && G.running ? 0.25 + Math.sin(now * 0.006) * 0.12 : 0); u.uWet.value = interior ? 0 : E.rain; composer.render(); }
    else renderer.render(sc, camera);
    In.endFrame();
  }
  boot().catch(e => { console.error('BOOT FAILED', e.stack || e); const d = document.getElementById('err'); if (d) d.textContent = 'Failed to start: ' + (e.message || e); window.DONE = true; });
})();
