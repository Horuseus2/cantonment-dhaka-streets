// Click-through test of multiplayer menu, Boys Club accounts and cloud saves (needs the local emulator). node uitest2.mjs <outDir>
import puppeteer from 'puppeteer-core'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const out = process.argv[2]; const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const EMU = '127.0.0.1:9000', NS = 'demo-bta-default-rtdb'; let fails = 0, errs = 0; const wait = ms => new Promise(r => setTimeout(r, ms));
await fetch(`http://${EMU}/.json?ns=${NS}`, { method: 'DELETE', headers: { Authorization: 'Bearer owner' } });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--window-size=1280,720', '--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--allow-file-access-from-files', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'], defaultViewport: { width: 1280, height: 720 } });
const url = uid => pathToFileURL(path.join(root, 'index.html')).href + `?uid=${uid}&fbemu=${EMU}&fbns=${NS}`;
async function open(ctx, uid) { const p = await ctx.newPage(); p.on('pageerror', e => { errs++; console.log(`[${uid} pageerror]`, (e.stack || e.message).slice(0, 500)); }); await p.goto(url(uid), { waitUntil: 'load', timeout: 120000 }); await p.waitForFunction('window.DONE===true', { timeout: 180000, polling: 250 }); await wait(700); return p; }
const check = (name, ok, extra) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); };
const top = (p, sel) => p.evaluate(sel => { const e = document.querySelector(sel); if (!e) return 'MISSING'; const r = e.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t === e || e.contains(t) ? 'ok' : 'COVERED by #' + ((t && t.closest('[id]')) || {}).id; }, sel);
const type = async (p, sel, text) => { await p.click(sel); await p.keyboard.type(text); };

const ctxA = await browser.createBrowserContext(); let A = await open(ctxA, 'uiA');
await A.click('#mMulti'); await wait(1200); check('multiplayer dialog on top', (await top(A, '#mpr')) === 'ok'); check('dialog reports server online', await A.$eval('#mpm', e => /online/.test(e.textContent)));
await A.$eval('#mpr', e => { e.value = ''; }); await type(A, '#mpr', 'Boys Room!'); await A.screenshot({ path: path.join(out, 'ui_mp_dialog.png') });
await A.click('#mpb'); await wait(400); await type(A, '#bpw', 'Boysarecool69'); await A.keyboard.press('Enter'); await wait(1500);
check('roster shows 15 members', (await A.$$eval('.boy', a => a.length)) === 15); check('roster mentions the boat and villa', await A.$eval('#boysBody', e => /Navy Patrol Boat/.test(e.textContent) && /Villa/.test(e.textContent) && /BMW i8/.test(e.textContent) && /Range Rover/.test(e.textContent)));
await A.screenshot({ path: path.join(out, 'ui_roster.png') });
await A.click('.boy[data-i="3"]'); await wait(1200); check('first visit asks to create a password', (await A.$('#f2')) !== null && (await top(A, '#f1')) === 'ok');
await type(A, '#f1', 'ishmam99'); await type(A, '#f2', 'ishmam98'); await type(A, '#fa', 'Cantonment'); await A.click('#fg'); await wait(500); check('mismatched passwords rejected', await A.$eval('#fm', e => /do not match/.test(e.textContent)));
await A.$eval('#f2', e => { e.value = ''; }); await type(A, '#f2', 'ishmam99'); await A.select('#fq', 'Which area did you grow up in?'); await A.screenshot({ path: path.join(out, 'ui_create_password.png') }); await A.click('#fg'); await wait(6000);
const s1 = await A.evaluate(() => ({ name: G.state.name, run: G.running, net: G.net.active, room: G.net.room, boy: G.state.boy })); check('created account, playing as Ishmam, joined the room', s1.name === 'Ishmam Saad' && s1.run && s1.net && s1.room === 'boysroom', s1);
await A.evaluate(() => { G.player.money = 123456; G.player.give('rpg', true); G.game.toMenu(); }); await wait(1500);
// same computer later: stays signed in
await A.close(); A = await open(ctxA, 'uiA'); await A.click('#mBoys'); await wait(1500); check('roster marks him as signed in on this device', await A.$eval('#bst3', e => /signed in/.test(e.textContent)), await A.$eval('#bst3', e => e.textContent));
await A.click('.boy[data-i="3"]'); await wait(6000); const s2 = await A.evaluate(() => ({ name: G.state.name, money: G.player.money, rpg: !!G.player.inv.rpg, run: G.running })); check('progress restored without retyping the password', s2.run && s2.money === 123456 && s2.rpg, s2);
// a different computer: must know the password
const ctxB = await browser.createBrowserContext(); const B = await open(ctxB, 'uiB'); await B.click('#mBoys'); await wait(300); await type(B, '#bpw', 'Boysarecool69'); await B.keyboard.press('Enter'); await wait(1500);
check('other computer sees the character is taken', await B.$eval('#bst3', e => /password/.test(e.textContent)), await B.$eval('#bst3', e => e.textContent));
await B.click('.boy[data-i="3"]'); await wait(1200); check('asks for the password', (await B.$('#f2')) === null && (await B.$('#f1')) !== null);
await type(B, '#f1', 'guess123'); await B.click('#fg'); await wait(1200); check('wrong password blocked', await B.$eval('#fm', e => /Wrong password/.test(e.textContent)) && !(await B.evaluate(() => G.running)));
await B.click('#ff'); await wait(400); check('forgot password shows his question', await B.$eval('#boysBody', e => /Which area did you grow up in/.test(e.textContent)));
await type(B, '#fa', 'Gulshan'); await type(B, '#f1', 'newpass77'); await B.click('#fg'); await wait(1200); check('wrong answer blocked', await B.$eval('#fm', e => /not right/.test(e.textContent)));
await B.$eval('#fa', e => { e.value = ''; }); await type(B, '#fa', 'cantonment'); await B.screenshot({ path: path.join(out, 'ui_forgot.png') }); await B.click('#fg'); await wait(6000);
const s3 = await B.evaluate(() => ({ name: G.state.name, money: G.player.money, run: G.running })); check('right answer resets password and loads cloud progress', s3.run && s3.name === 'Ishmam Saad' && s3.money === 123456, s3);
// join from the pause menu, chat with the keyboard, player list
await B.keyboard.press('Escape'); await wait(400); await B.click('#pause button[data-act="mp"]'); await wait(1300); await B.$eval('#mpr', e => { e.value = ''; }); await type(B, '#mpr', 'boysroom'); await B.click('#mpj'); await wait(2500);
check('joined from the pause menu', await B.evaluate(() => G.net.active && G.net.room === 'boysroom' && !G.ui.blocking));
await A.evaluate(() => G.net.join('boysroom')); await wait(1500);
await B.keyboard.press('KeyT'); await wait(300); check('T opens the chat box', await B.$eval('#chatIn', e => !e.classList.contains('hidden') && document.activeElement === e)); await B.keyboard.type('ki obostha boys'); await B.keyboard.press('Enter'); await wait(1200);
check('typed chat arrives on the other computer', await A.$eval('#chat', e => /ki obostha boys/.test(e.textContent))); check('chat box closes and W moves again', await B.evaluate(() => !G.ui.chatOpen && !G.ui.blocking));
await B.keyboard.down('KeyZ'); await wait(1300); check('holding Z shows the player list', await B.$eval('#score', e => !e.classList.contains('hidden') && /Ishmam Saad/.test(e.textContent))); await B.screenshot({ path: path.join(out, 'ui_scoreboard.png') }); await B.keyboard.up('KeyZ');
console.log(`RESULT fails=${fails} pageerrors=${errs}`); await browser.close();
