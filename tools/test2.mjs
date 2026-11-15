// feature tests for villa / boat / duplex / wardrobe: node test2.mjs <outDir> [steps...]
import puppeteer from 'puppeteer-core'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const out = process.argv[2]; const only = process.argv.slice(3);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--window-size=1280,720', '--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'], defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage(); const errs = [];
page.on('console', m => { const t = m.text(); if ((m.type() === 'error' || m.type() === 'warning') && !/GPU stall|AudioContext|pointer lock|WebGL-|willReadFrequently|firebase|FIREBASE|WebSocket|ERR_/i.test(t)) { errs.push(t); console.log('[' + m.type() + ']', t.slice(0, 400)); } });
page.on('pageerror', e => { errs.push(e.message); console.log('[pageerror]', (e.stack || e.message).slice(0, 700)); });
await page.goto(pathToFileURL(path.join(root, 'index.html')).href + '?auto=1&offline=1', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction('window.DONE===true', { timeout: 180000, polling: 250 });
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async (fn, ...a) => { try { const r = await page.evaluate(fn, ...a); if (r !== undefined) console.log('  ->', JSON.stringify(r)); return r; } catch (e) { console.log('  EVAL ERR', e.message.slice(0, 500)); errs.push(e.message); } };
const shot = n => page.screenshot({ path: path.join(out, n + '.png') });
const look = (u, v, tu, tv, y) => ev((u, v, tu, tv) => { const E = G.estate, p = E.toWorld(u, v), t = E.toWorld(tu, tv), pl = G.player; pl.teleport(p[0], p[1]); G.cam.yaw = Math.atan2(t[0] - p[0], t[1] - p[1]); G.cam.pitch = -0.12; }, u, v, tu, tv);
const steps = {
  async villa() {
    await ev(() => { G.boysUnlocked = true; G.env.time = 10.5; G.env.setWeather('clear', true); G.game.playAsBoy(14); }); await wait(4500);
    await ev(() => { const E = G.estate; return { name: G.state.name, guards: E.guards && E.guards.length, cars: G.Veh.list.filter(v => v.boyCar === 14).map(v => v.def.name), cat: !!E.cat, gate: E.gateOpen.toFixed(2), poi: G.boys.house(14).c, spec: E.S }; });
    await ev(() => { const E = G.estate, p = E.toWorld(-10, 55), pl = G.player; pl.teleport(p[0], p[1]); const t = E.toWorld(4, 0); G.cam.yaw = Math.atan2(t[0] - p[0], t[1] - p[1]); G.cam.pitch = 0.02; }); await wait(1500); await shot('villa_outside');
    await look(-10, 38, -10, 0); await wait(3500); await ev(() => ({ gate: G.estate.gateOpen.toFixed(2), off: G.estate.gateSolid.off })); await shot('villa_gate_open');
    await look(-8, 16, 14, -8); await wait(900); await shot('villa_house');
    await look(-12, -14, -28, -14); await wait(900); await shot('villa_garage');
    await look(8, 24, 18, 8); await wait(900); await shot('villa_pool');
    await ev(() => { const c = G.estate.cat, pl = G.player; pl.teleport(c.x + 1.6, c.z + 1.2); G.cam.yaw = Math.atan2(c.x - pl.pos.x, c.z - pl.pos.z); G.cam.pitch = -0.35; G.cam.frontTest = 1; }); await wait(700); await shot('villa_zelda');
    await ev(() => { const i = G.player.findInteract(); return i.E && i.E.label; });
    await look(-17, 12, -27, 12); await wait(700); await shot('villa_armory_out');
    await ev(() => { G.game.enterInterior(G.estate.armoryPoi); }); await wait(1600); await ev(() => { G.cam.yaw = Math.PI; G.cam.pitch = -0.1; return [G.player.mode, G.interior.spots.map(s => s.label)]; }); await wait(500); await shot('armory_inside');
    await ev(() => { G.interior.spots.find(s => s.label === 'Arm up').fn(); }); await wait(400); await shot('armory_menu'); await ev(() => { G.ui.menu.items[0].fn(); G.ui.closeMenu(); return Object.keys(G.player.inv).length; }); await ev(() => G.game.exitInterior()); await wait(1500);
    await ev(() => { G.game.enterInterior(G.estate.housePoi); }); await wait(1700); await ev(() => { G.cam.yaw = Math.PI - 0.5; G.cam.pitch = 0.1; return [G.interior.w, G.interior.d, G.interior.levels.length, G.interior.ramps.length, G.interior.spots.map(s => s.label + '@' + (s.y || 0))]; }); await wait(500); await shot('villa_inside');
    // walk up the stairs with real movement input
    await ev(() => { const I = G.interior, R = I.ramps[0], pl = G.player; pl.pos.x = (R.x0 + R.x1) / 2; pl.pos.z = R.z1 + 0.8; pl.pos.y = 0; G.cam.yaw = Math.PI; G.cam.pitch = -0.2; G.input.keys.KeyW = true; }); await wait(3800); await ev(() => { G.input.keys.KeyW = false; const p = G.player.pos; return { y: +p.y.toFixed(2), z: +p.z.toFixed(2) }; }); await shot('villa_upstairs');
    await ev(() => { const s = G.interior.spots.find(s => s.label === 'Open wardrobe'); s.fn(); }); await wait(1400); await shot('wardrobe_open'); await ev(() => { document.getElementById('wardCancel').click(); }); await wait(300);
    await ev(() => { const pl = G.player; G.input.keys.KeyS = true; G.cam.yaw = Math.PI; }); await wait(600); await ev(() => { G.input.keys.KeyS = false; return +G.player.pos.y.toFixed(2); });
    await ev(() => G.game.exitInterior()); await wait(1500);
    // trespass as a non member
    await ev(() => { G.game.quickStart(); }); await wait(2500); await ev(() => { const E = G.estate, p = E.toWorld(0, 10); G.player.teleport(p[0], p[1]); }); await wait(2500); await ev(() => ({ hostile: G.estate.guards ? G.estate.guards.filter(g => g.hostile).length : -1, gate: G.estate.gateOpen.toFixed(2), hp: Math.round(G.player.health) })); await ev(() => { G.player.god = true; });
  },
  async boat() {
    await ev(() => { G.boysUnlocked = true; G.env.time = 16.5; G.env.setWeather('clear', true); G.game.playAsBoy(4); }); await wait(4500);
    await ev(() => { const d = G.estate.dock, b = G.Veh.list.find(v => v.id === 'boat'), h = G.boys.house(4), pl = G.player; return { dock: !!d, boat: !!b, houseToDock: Math.round(Math.hypot(h.x - d.x, h.z - d.z)), boatInWater: b && G.world.inWaterRaw(b.x, b.z), onDock: G.world.onDock(d.ex, d.ez), playerInWaterOnDock: G.world.inWater(d.ex, d.ez) }; });
    await ev(() => { G.cam.yaw += Math.PI; }); await wait(900); await shot('irtiza_house');
    await ev(() => { const d = G.estate.dock, pl = G.player; pl.teleport(d.x - Math.sin(d.a) * 7, d.z - Math.cos(d.a) * 7); G.cam.yaw = d.a; G.cam.pitch = -0.18; }); await wait(1200); await shot('dock');
    await ev(() => { const d = G.estate.dock, pl = G.player; pl.teleport(d.ex, d.ez); const i = pl.findInteract(); return i.F && i.F.label; });
    await ev(() => { const b = G.Veh.list.find(v => v.id === 'boat'); G.player.enterVehicle(b); G.cam.yaw = b.h + 0.6; G.cam.pitch = -0.25; G.cam.behindT = 99; }); await wait(1200); await shot('boat_aboard');
    await ev(() => { G.cam.behindT = 0; G.input.keys.KeyW = true; }); await wait(5000); await ev(() => { G.input.keys.KeyD = true; }); await wait(2500); await ev(() => { G.input.keys.KeyD = false; const b = G.player.vehicle; return { kmh: Math.round(b.speed * 3.6), inWater: G.world.inWaterRaw(b.x, b.z), y: +b.y.toFixed(2), hp: b.health }; }); await shot('boat_driving');
    await wait(9000); await ev(() => { G.input.keys.KeyW = false; const b = G.player.vehicle; return { stillInWater: G.world.inWaterRaw(b.x, b.z), kmh: Math.round(b.speed * 3.6) }; }); await shot('boat_later');
    await ev(() => { G.player.exitVehicle(); return G.player.mode; });
  },
  async duplex() {
    await ev(() => { G.boysUnlocked = true; G.game.playAsBoy(10); }); await wait(4500);
    await ev(() => { const h = G.boys.house(10), pl = G.player, W = G.world; let near = 0; for (const [k, ch] of W.chunks) { } const p = { x: h.x + Math.sin(h.a) * 9, z: h.z + Math.cos(h.a) * 9 }; pl.teleport(p.x, p.z); G.cam.yaw = h.a + Math.PI; G.cam.pitch = 0.0; G.env.time = 11; G.env.setWeather('clear', true); return G.state.name; }); await wait(1500); await shot('nuhin_door');
    await ev(() => { G.game.enterInterior(G.boys.house(10)); }); await wait(1700); await ev(() => { G.cam.yaw = Math.PI - 0.45; G.cam.pitch = 0.12; }); await wait(500); await shot('duplex_inside');
    await ev(() => { const I = G.interior, R = I.ramps[0], pl = G.player; pl.pos.x = (R.x0 + R.x1) / 2; pl.pos.z = R.z1 + 0.8; G.cam.yaw = Math.PI; G.cam.pitch = -0.25; G.input.keys.KeyW = true; }); await wait(1600); await shot('duplex_on_stairs'); await wait(2400); await ev(() => { G.input.keys.KeyW = false; return { y: +G.player.pos.y.toFixed(2) }; });
    await ev(() => { G.cam.yaw = Math.PI * 0.5; G.cam.pitch = -0.2; G.input.keys.KeyW = true; }); await wait(1500); await ev(() => { G.input.keys.KeyW = false; G.cam.yaw = Math.PI * 0.75; }); await wait(500); await shot('duplex_upper');
    // try to walk off the balcony edge: must be stopped by the railing
    await ev(() => { G.cam.yaw = 0; G.input.keys.KeyW = true; }); await wait(2500); await ev(() => { G.input.keys.KeyW = false; return { yAfterEdge: +G.player.pos.y.toFixed(2), z: +G.player.pos.z.toFixed(2) }; });
    await ev(() => { const s = G.interior.spots.find(s => s.label === 'Open wardrobe'); G.player.pos.y = s.y; s.fn(); }); await wait(1500); await shot('duplex_wardrobe'); await ev(() => { document.getElementById('wardCancel').click(); G.game.exitInterior(); }); await wait(1500);
    // bungalow for comparison
    await ev(() => { G.game.playAsBoy(2); }); await wait(4000); await ev(() => { G.game.enterInterior(G.boys.house(2)); }); await wait(1700); await ev(() => { const s = G.interior.spots.find(s => s.label === 'Open wardrobe'); s.fn(); return [G.interior.levels.length, G.interior.d]; }); await wait(1400); await shot('bungalow_wardrobe'); await ev(() => { document.getElementById('wardCancel').click(); G.game.exitInterior(); }); await wait(1400);
  }
};
for (const k of (only.length ? only : Object.keys(steps))) { console.log('STEP', k); await steps[k](); await ev(() => document.getElementById('err').textContent || undefined); }
console.log('ERRORS', errs.length); await browser.close();
