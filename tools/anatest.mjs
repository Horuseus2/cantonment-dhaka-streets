// Analytics page test (needs the local emulator). node anatest.mjs <outDir>
import puppeteer from 'puppeteer-core'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const out = process.argv[2]; const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const EMU = '127.0.0.1:9000', NS = 'demo-bta-default-rtdb'; let fails = 0, errs = 0; const wait = ms => new Promise(r => setTimeout(r, ms));
await fetch(`http://${EMU}/.json?ns=${NS}`, { method: 'DELETE', headers: { Authorization: 'Bearer owner' } });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--window-size=1280,720', '--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--allow-file-access-from-files', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'], defaultViewport: { width: 1280, height: 720 } });
const check = (name, ok, extra) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); };
async function open(ctx, uid, extra = '') { const p = await ctx.newPage(); p.on('pageerror', e => { errs++; console.log(`[${uid} pageerror]`, (e.stack || e.message).slice(0, 500)); }); await p.goto(pathToFileURL(path.join(root, 'index.html')).href + `?uid=${uid}&fbemu=${EMU}&fbns=${NS}${extra}`, { waitUntil: 'load', timeout: 120000 }); await p.waitForFunction('window.DONE===true', { timeout: 180000, polling: 250 }); await wait(600); return p; }
// seed: nine members with different amounts of play, written through the real account + save path
const seedCtx = await browser.createBrowserContext(), S = await open(seedCtx, 'seed');
const seeded = await S.evaluate(async () => {
  const mk = (i, h, o) => ({ state: { name: G.BOYS[i].name, boy: i, app: G.BOYS[i].app, owned: Object.fromEntries((o.props || []).map(k => [k, 1])), garage: (o.cars || []).map(id => ({ id, color: '#fff' })), robbed: {}, missions: Object.fromEntries(['m1'].concat(o.missions || []).map(m => [m, 1])), stats: Object.assign({ playSec: h * 3600, sessions: o.sessions || 3 }, o.stats || {}) }, p: { x: 0, z: 0, h: 0, health: 100, armor: 0, money: o.money || 500000, bank: o.bank || 5000000, inv: Object.fromEntries(['fist'].concat(o.guns || ['pistol']).map(g => [g, { clip: 1, ammo: 1 }])), weapon: 'fist', medkits: 1 }, env: { time: 9, day: 0, weather: 'clear' } });
  const D = [
    [14, 21.6, { missions: ['m2', 'm3', 'm4', 'm5'], props: [1, 2, 3, 4], cars: ['sports', 'suv', 'bike'], guns: ['pistol', 'ak', 'carbine', 'shotgun', 'sniper', 'smg', 'rpg', 'lmg', 'bat'], money: 2400000, bank: 9800000, stats: { earned: 6200000, fares: 12, deliveries: 9, busStops: 14, driven: 84000, walked: 21000, kills: 44, pvpK: 31, pvpD: 12, wasted: 9, busted: 2, robberies: 6 }, sessions: 19 }],
    [9, 14.2, { missions: ['m2', 'm3', 'm5'], props: [1, 2], cars: ['sports', 'sportbike', 'hatch', 'suv', 'sedan'], guns: ['pistol', 'smg', 'ak'], money: 900000, bank: 7100000, stats: { earned: 2400000, fares: 30, deliveries: 2, driven: 162000, walked: 6000, pvpK: 9, pvpD: 15, wasted: 14 }, sessions: 12 }],
    [5, 9.5, { missions: ['m2', 'm3'], props: [1], cars: ['sports'], guns: ['pistol', 'sniper', 'carbine', 'ak'], stats: { earned: 380000, fares: 3, deliveries: 11, driven: 41000, walked: 9000, pvpK: 18, pvpD: 7 } }],
    [2, 7.8, { missions: ['m2'], guns: ['pistol', 'carbine', 'shotgun', 'rpg', 'lmg'], stats: { earned: 140000, busStops: 9, driven: 22000, walked: 14000, pvpK: 22, pvpD: 20, wasted: 22 } }],
    [1, 5.1, { missions: ['m2', 'm3', 'm4'], props: [1, 2, 3, 4, 5, 6], cars: ['suv', 'sedan'], money: 3100000, bank: 15000000, stats: { earned: 12500000, fares: 0, driven: 9000, walked: 3000, pvpK: 1, pvpD: 4 } }],
    [4, 3.4, { guns: ['pistol', 'carbine'], stats: { earned: 20000, driven: 6000, walked: 4000, pvpK: 2, pvpD: 2 } }],
    [10, 1.2, { props: [2], stats: { earned: 90000, driven: 3000, walked: 1500 } }],
    [7, 0.4, { stats: { driven: 800, walked: 600 } }],
    [12, 0.05, { stats: {} }]
  ];
  for (const [i, h, o] of D) { const r = await G.boyAuth.create(i, 'seedpass' + i, 'Which area did you grow up in?', 'dhaka'); if (!r.ok) return 'create failed ' + i; G.boyAuth.putSave(i, mk(i, h, o), true); await new Promise(r => setTimeout(r, 120)); }
  await new Promise(r => setTimeout(r, 900)); return D.length;
});
check('seeded nine members through the account system', seeded === 9, seeded); await S.close();
// a member on another computer opens the page with real clicks
const ctx = await browser.createBrowserContext(), P = await open(ctx, 'viewer');
await P.click('#mBoys'); await wait(300); await P.click('#bpw'); await P.keyboard.type('Boysarecool69'); await P.keyboard.press('Enter'); await wait(1200);
await P.click('#ban'); await P.waitForSelector('.ana tbody tr', { timeout: 15000 }); await wait(800);
const top = sel => P.evaluate(sel => { const e = document.querySelector(sel), r = e.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t === e || e.contains(t); }, sel);
check('analytics page opens on top', await top('#anaClose'));
const rows = await P.$$eval('.ana tbody tr', a => a.map(tr => ({ name: tr.querySelector('b').textContent, play: tr.querySelectorAll('td.pbar u')[0].textContent, pct: tr.querySelectorAll('td.pbar u')[1].textContent, w: parseFloat(tr.querySelector('td.pbar i').style.width), none: tr.classList.contains('none') })));
check('all 15 members listed', rows.length === 15);
check('sorted by playtime, most first', rows[0].name === 'Sifar Mahfuz Adnan' && rows[1].name === 'Abid Hasan' && rows[2].name === 'Labib Khan', rows.slice(0, 3).map(r => r.name + ' ' + r.play));
check('playtime figures are right', rows[0].play === '21 h 36 min' && rows[1].play === '14 h 12 min' && rows.find(r => r.name === 'Jawwad Jaheen').play === '3 min', [rows[0].play, rows[1].play, rows.find(r => r.name === 'Jawwad Jaheen').play]);
check('bars proportional to playtime', rows[0].w === 100 && Math.abs(rows[1].w - 14.2 / 21.6 * 100) < 0.5, [rows[0].w, rows[1].w]);
check('six members who never played are greyed out and last', rows.filter(r => r.none).length === 6 && rows.slice(9).every(r => r.none));
const kp = await P.$$eval('.kpi', a => a.map(k => k.querySelector('b').textContent + ' | ' + k.querySelector('small').textContent)); check('headline tiles', /^63 h 15 min/.test(kp[0]) && /^9 of 15/.test(kp[1]) && /Sifar/.test(kp[2]), kp);
check('note says data is live from the server', await P.$eval('#anaNote', e => /Live from the server/.test(e.textContent)));
await P.screenshot({ path: path.join(out, 'ana_main.png') });
// expected score for Sifar: missions 4/4 (25) + earned capped (15) + jobs 35/30 capped (15) + props 4/6 (10) + cars 3/5 (6) + guns 9/11 (8.18) + km capped (10) = 89
check('progress score matches the formula', rows[0].pct === '89%', rows[0].pct);
await P.evaluate(() => [...document.querySelectorAll('.ana th button')].find(b => /Progress/.test(b.textContent)).click()); await wait(300);
const byPct = await P.$$eval('.ana tbody tr', a => a.slice(0, 4).map(tr => tr.querySelector('b').textContent + ' ' + tr.querySelectorAll('td.pbar u')[1].textContent)); check('clicking Progress sorts by progress', /Sifar/.test(byPct[0]) && parseInt(byPct[0].split(' ').pop()) >= parseInt(byPct[1].split(' ').pop()) && parseInt(byPct[1].split(' ').pop()) >= parseInt(byPct[2].split(' ').pop()), byPct);
await P.evaluate(() => [...document.querySelectorAll('.ana tbody tr')].find(tr => /Abid Hasan/.test(tr.textContent)).click()); await wait(300);
const det = await P.$eval('.detail', e => e.textContent); check('clicking a member shows the breakdown', /Abid Hasan/.test(det) && /Story missions/.test(det) && /3 of 4/.test(det) && /162\.0 km/.test(det) && /PvP kills \/ deaths9 \/ 15/.test(det), det.slice(0, 160));
await P.screenshot({ path: path.join(out, 'ana_detail.png') });
await P.keyboard.press('Escape'); await wait(300); check('Esc closes it', await P.$eval('#ana', e => e.classList.contains('hidden')));
// live tracking: sign in as a seeded member, play a few seconds, earn money, check the page from the pause menu
await P.click('#mBoys'); await wait(900); await P.click('.boy[data-i="7"]'); await P.waitForSelector('#f1'); await P.click('#f1'); await P.keyboard.type('seedpass7'); await P.click('#fg'); await wait(6500);
await P.evaluate(() => { G.player.money += 50000; }); await wait(4000);
const live = await P.evaluate(() => ({ name: G.state.name, play: G.state.stats.playSec, earned: G.state.stats.earned, sessions: G.state.stats.sessions })); check('playtime and earnings count up while playing', live.name === 'Ibm Rakin Afnan' && live.play > 0.4 * 3600 + 5 && live.earned === 50000 && live.sessions === 4, live);
await P.keyboard.press('Escape'); await wait(400); await P.click('#pause button[data-act="ana"]'); await P.waitForSelector('.ana tbody tr'); await wait(1500);
const mine = await P.$$eval('.ana tbody tr', a => { const tr = a.find(t => /Ibm Rakin Afnan/.test(t.textContent)); return { txt: tr.querySelector('td:nth-child(2)').textContent, last: tr.lastElementChild.textContent }; }); check('own row is marked "you" and shows Online', /you/.test(mine.txt) && /Online/.test(mine.txt) && mine.last === 'now', mine);
await P.screenshot({ path: path.join(out, 'ana_ingame.png') });
// without the club password the page stays shut
const ctx2 = await browser.createBrowserContext(), Q = await open(ctx2, 'outsider'); check('locked without the club password', await Q.evaluate(() => { G.analytics.show(); return document.getElementById('ana').classList.contains('hidden'); }));
console.log(`RESULT fails=${fails} pageerrors=${errs}`); await browser.close();
