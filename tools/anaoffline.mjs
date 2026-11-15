// Analytics page with no server (the state of the live site until the database is created). node anaoffline.mjs <outDir> [url]
import puppeteer from 'puppeteer-core'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const out = process.argv[2]; const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const url = process.argv[3] || pathToFileURL(path.join(root, 'index.html')).href; let fails = 0, errs = 0; const wait = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--window-size=1280,720', '--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--allow-file-access-from-files'], defaultViewport: { width: 1280, height: 720 } });
const check = (n, ok, x) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); };
const P = await browser.newPage(); P.on('pageerror', e => { errs++; console.log('[pageerror]', (e.stack || e.message).slice(0, 400)); });
await P.goto(url, { waitUntil: 'load', timeout: 120000 }); await P.waitForFunction('window.DONE===true', { timeout: 180000, polling: 250 }); await wait(700);
await P.click('#mBoys'); await wait(300); await P.click('#bpw'); await P.keyboard.type('Boysarecool69'); await P.keyboard.press('Enter'); await P.waitForSelector('#ban', { timeout: 20000 });
check('analytics button is in the Boys Club roster', (await P.$('#ban')) !== null);
await P.click('.boy[data-i="5"]'); await P.waitForSelector('#f1', { timeout: 20000 }); const create = (await P.$('#f2')) !== null;
if (create) { await P.click('#f1'); await P.keyboard.type('labib123'); await P.click('#f2'); await P.keyboard.type('labib123'); await P.click('#fa'); await P.keyboard.type('texas'); } else { await P.click('#f1'); await P.keyboard.type('labib123'); }
await P.click('#fg'); await wait(7000);
check('playing as Labib', await P.evaluate(() => G.running && G.state.name === 'Labib Khan'));
await wait(3000); await P.keyboard.press('Escape'); await wait(500); await P.click('#pause button[data-act="ana"]'); await P.waitForSelector('.ana tbody tr', { timeout: 20000 }); await wait(1200);
const note = await P.$eval('#anaNote', e => e.textContent); const row = await P.$$eval('.ana tbody tr', a => { const tr = a[0]; return { name: tr.querySelector('b').textContent, play: tr.querySelectorAll('td.pbar u')[0].textContent, rows: a.length }; });
check('page opens from the pause menu and lists 15 members', row.rows === 15, row); check('own playtime is counted', /Labib Khan/.test(row.name) && /you/.test(row.name) && /\d+ s|min/.test(row.play), row);
check('says clearly when the server is not reachable', /this device|Live from the server/.test(note), note);
await P.screenshot({ path: path.join(out, 'ana_offline.png') }); await P.click('#anaClose'); await wait(300); check('closes and game continues', await P.evaluate(() => !G.ui.anaOpen && G.running));
console.log(`RESULT fails=${fails} pageerrors=${errs}`); await browser.close();
