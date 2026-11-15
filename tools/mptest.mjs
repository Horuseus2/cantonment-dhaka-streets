// Multiplayer + accounts test against the local Firebase emulator. node mptest.mjs <outDir>
import puppeteer from 'puppeteer-core'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const out = process.argv[2]; const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const EMU = '127.0.0.1:9000', NS = 'demo-bta-default-rtdb';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--window-size=1280,720', '--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'], defaultViewport: { width: 1280, height: 720 } });
let errs = 0, fails = 0; const wait = ms => new Promise(r => setTimeout(r, ms));
async function open(uid) { const ctx = await browser.createBrowserContext(); const p = await ctx.newPage(); p.on('pageerror', e => { errs++; console.log(`[${uid} pageerror]`, (e.stack || e.message).slice(0, 500)); }); p.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/GPU stall|AudioContext|pointer lock|WebGL-|ERR_|permission_denied|PERMISSION_DENIED/i.test(t)) { console.log(`[${uid} error]`, t.slice(0, 300)); } }); await p.goto(pathToFileURL(path.join(root, 'index.html')).href + `?auto=1&uid=${uid}&fbemu=${EMU}&fbns=${NS}`, { waitUntil: 'load', timeout: 120000 }); await p.waitForFunction('window.DONE===true', { timeout: 180000, polling: 250 }); return p; }
const check = (name, ok, extra) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); };
await fetch(`http://${EMU}/.json?ns=${NS}`, { method: 'DELETE', headers: { Authorization: 'Bearer owner' } });
const A = await open('testA'), B = await open('testB');
await A.evaluate(() => { G.state.name = 'Alpha'; G.player.god = true; }); await B.evaluate(() => { G.state.name = 'Bravo'; G.player.god = false; });
const room = 't' + Date.now().toString(36);
const ja = await A.evaluate(r => G.net.join(r), room), jb = await B.evaluate(r => G.net.join(r), room);
check('A joins', ja.ok, ja); check('B joins', jb.ok && jb.count === 2, jb); await wait(1500);
check('A sees B', await A.evaluate(() => G.net.remotes.size === 1 && [...G.net.remotes.values()][0].name === 'Bravo'));
check('B sees A', await B.evaluate(() => G.net.remotes.size === 1 && [...G.net.remotes.values()][0].name === 'Alpha'));
// position sync
await A.evaluate(() => { G.env.setWeather('clear', true); }); const pa = await A.evaluate(() => ({ x: G.player.pos.x, z: G.player.pos.z, h: G.player.heading }));
await B.evaluate(p => { G.player.teleport(p.x + Math.sin(p.h) * 5, p.z + Math.cos(p.h) * 5, p.h + Math.PI); }, pa); await wait(1500);
const d1 = await A.evaluate(() => { const r = [...G.net.remotes.values()][0], pl = G.player; G.cam.yaw = Math.atan2(r.x - pl.pos.x, r.z - pl.pos.z); G.cam.pitch = -0.05; return { d: +Math.hypot(r.x - pl.pos.x, r.z - pl.pos.z).toFixed(2), vis: r.ch.root.visible, hidden: r.hidden, inList: G.npc.list.includes(r) }; });
const pb = await B.evaluate(() => ({ x: G.player.pos.x, z: G.player.pos.z })); const pr = await A.evaluate(() => { const r = [...G.net.remotes.values()][0]; return { x: r.x, z: r.z }; }); const off = Math.hypot(pb.x - pr.x, pb.z - pr.z);
check('B shows up for A at the right spot', off < 0.3 && d1.vis && !d1.hidden && d1.inList, { errorMetres: +off.toFixed(3), dist: d1.d }); await wait(600); await A.screenshot({ path: path.join(out, 'mp_see_friend.png') });
// walking is interpolated
await B.evaluate(() => { G.cam.yaw = G.player.heading + Math.PI / 2; G.input.keys.KeyW = true; }); await wait(1200); const mv = await A.evaluate(() => { const r = [...G.net.remotes.values()][0]; return { sp: r.speed, buf: r.buf.length }; }); await B.evaluate(() => { G.input.keys.KeyW = false; }); check('A sees B walking', mv.sp > 1 && mv.buf >= 2, mv);
// shooting: A hits B
const hp0 = await B.evaluate(() => G.player.health); await A.evaluate(() => { const r = [...G.net.remotes.values()][0]; r.hit(40, 'body', 0, 0, 'player'); }); await wait(900); const hp1 = await B.evaluate(() => G.player.health); check('A shooting B damages B', hp1 < hp0, { hp0, hp1 });
// real bullet: A aims at B and fires
await B.evaluate(p => { G.player.health = 100; G.player.teleport(p.x + Math.sin(p.h) * 6, p.z + Math.cos(p.h) * 6); }, pa); await wait(1200);
await A.evaluate(() => { const r = [...G.net.remotes.values()][0], pl = G.player; pl.selectWeapon('ak'); G.cam.yaw = Math.atan2(r.x - pl.pos.x, r.z - pl.pos.z); G.cam.pitch = -0.12; G.input.locked = true; G.input.mb[2] = true; }); await wait(500);
for (let k = 0; k < 4; k++) { await A.evaluate(() => { const r = [...G.net.remotes.values()][0], c = G.cam.pos, dx = r.x - c.x, dz = r.z - c.z; G.cam.yaw = Math.atan2(dx, dz); G.cam.pitch = Math.atan2(r.y + 1.15 - c.y, Math.hypot(dx, dz)); }); await wait(120); } await A.evaluate(() => { G.input.mb[0] = true; }); await wait(900); await A.evaluate(() => { G.input.mb[0] = false; G.input.mb[2] = false; }); await wait(700);
const hp2 = await B.evaluate(() => G.player.health); check('A firing an AK at B lands hits over the network', hp2 < 100, { hp2 });
// chat
await A.evaluate(() => G.net.chat('salam bhai')); await wait(800); check('chat reaches B', await B.evaluate(() => document.getElementById('chat').textContent.includes('salam bhai')));
// vehicle sync
await B.evaluate(() => { const pl = G.player; pl.health = 100; pl.god = true; const v = G.traffic.spawnOnRoad(pl.pos.x, pl.pos.z, 'sports', {}); pl.enterVehicle(v); G.input.keys.KeyW = true; }); await wait(2500);
const veh = await A.evaluate(() => { const r = [...G.net.remotes.values()][0]; return { has: !!r.veh, id: r.veh && r.veh.id, sp: r.speed, remoteFlag: r.veh && r.veh.remote, inList: r.veh && G.Veh.list.includes(r.veh) }; }); check('A sees B driving a car', veh.has && veh.id === 'sports' && veh.sp > 2 && veh.inList, veh);
await A.evaluate(() => { const r = [...G.net.remotes.values()][0], pl = G.player; pl.teleport(r.x - 9, r.z - 6); G.cam.yaw = Math.atan2(r.x - pl.pos.x, r.z - pl.pos.z); G.cam.pitch = -0.1; }); await wait(500); await A.screenshot({ path: path.join(out, 'mp_friend_driving.png') });
await B.evaluate(() => { G.input.keys.KeyW = false; G.player.exitVehicle(); }); await wait(1200); check('car stays behind when B gets out', await A.evaluate(() => { const r = [...G.net.remotes.values()][0]; return !r.veh && r.mode === 0; }));
// shared clock + weather
const ta = await A.evaluate(() => [G.env.time, G.env.weather]), tb = await B.evaluate(() => [G.env.time, G.env.weather]); check('same clock and weather', Math.abs(ta[0] - tb[0]) < 0.05 && ta[1] === tb[1], [ta, tb]);
// explosion
await A.evaluate(() => { const pl = G.player; G.fx.explosion(pl.pos.x + 30, 1, pl.pos.z, 1, 'player'); }); await wait(900); check('scoreboard lists both', await A.evaluate(() => G.net.players().length === 2));
// interiors: same building means same room
const poi = await A.evaluate(() => { const p = G.world.pois.find(p => p.c === 'food' && p.b >= 0); G.wanted.clear(); G.game.enterInterior(p); return p.id; }); await wait(1500);
check('B (outside) does not see A indoors', await B.evaluate(() => { const r = [...G.net.remotes.values()][0]; return r.int && r.hidden && !r.ch.root.visible; }));
await B.evaluate(id => { G.wanted.clear(); G.game.enterInterior(G.world.pois[id]); }, poi); await wait(2000);
const ins = await A.evaluate(() => { const r = [...G.net.remotes.values()][0]; G.cam.yaw = Math.atan2(r.x - G.player.pos.x, r.z - G.player.pos.z); return { vis: r.ch.root.visible, near: +r.near.toFixed(1), parent: r.par }; }); check('both in the same restaurant see each other', ins.vis && ins.near < 5 && ins.parent === 'i', ins); await wait(500); await A.screenshot({ path: path.join(out, 'mp_indoors.png') });
await A.evaluate(() => G.game.exitInterior()); await B.evaluate(() => G.game.exitInterior()); await wait(1500);
// ---------- accounts ----------
const i = 7; const acct = async (p, fn, ...a) => p.evaluate(fn, ...a);
check('character starts unclaimed', !(await acct(A, i => G.boyAuth.status(i), i)).claimed);
check('A creates password', (await acct(A, i => G.boyAuth.create(i, 'pass1234', 'What is your favourite food?', '  Kacchi  Biryani '), i)).ok);
const st = await acct(B, i => G.boyAuth.status(i), i); check('B sees it is claimed and gets the question', st.claimed && /food/.test(st.q), st);
check('second create is refused', !(await acct(B, i => G.boyAuth.create(i, 'hacker99', 'q', 'a'), i)).ok);
check('wrong password refused', !(await acct(B, i => G.boyAuth.login(i, 'nope'), i)).ok);
check('right password accepted', (await acct(B, i => G.boyAuth.login(i, 'pass1234'), i)).ok);
check('hash cannot be read', await acct(B, i => G.cloud.db.ref('boysAuth/' + i + '/ph').once('value').then(() => false).catch(() => true), i));
check('whole auth record cannot be read', await acct(B, i => G.cloud.db.ref('boysAuth/' + i).once('value').then(() => false).catch(() => true), i));
check('save without signing in is refused', await acct(B, () => G.cloud.db.ref('boysSave/8').set({ d: '{}', t: 1 }).then(() => false).catch(() => true)));
await acct(A, i => { G.boyAuth.putSave(i, { state: { boy: i, hello: 'world' }, p: { money: 777 } }, true); }, i); await wait(900);
const sv = await acct(B, i => G.boyAuth.loadSave(i), i); check('progress saved to the cloud and loaded on another computer', sv && sv.p && sv.p.money === 777, sv);
check('reset with wrong answer refused', !(await acct(B, i => G.boyAuth.reset(i, 'pizza', 'newpass1'), i)).ok);
check('reset with right answer (case and spacing ignored)', (await acct(B, i => G.boyAuth.reset(i, 'kacchi biryani', 'newpass1'), i)).ok);
check('old password no longer works', !(await acct(A, i => G.boyAuth.login(i, 'pass1234'), i)).ok);
check('new password works', (await acct(A, i => G.boyAuth.login(i, 'newpass1'), i)).ok);
// ---------- leaving, capacity ----------
await B.evaluate(() => G.net.leave()); await wait(1200); check('A sees B leave', await A.evaluate(() => G.net.remotes.size === 0));
const full = await B.evaluate(async r => { const up = {}; for (let k = 0; k < 18; k++) up['rooms/' + r + 'f/m/fake' + k] = { n: 'Bot ' + k, a: '{}', b: -1 }; await G.cloud.db.ref().update(up); return G.net.join(r + 'f'); }, room); check('19th player is turned away', !full.ok && /full/.test(full.why), full);
console.log(`RESULT fails=${fails} pageerrors=${errs}`); await browser.close();
