// usage: node shot.mjs <page.html?query> <out.png> [waitExpr] [evalAfter]
import puppeteer from 'puppeteer-core';
import path from 'node:path'; import { pathToFileURL } from 'node:url';
const [page_, out, waitExpr, evalAfter] = process.argv.slice(2);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const [file, query] = page_.split('?');
const url = pathToFileURL(path.join(root, file)).href + (query ? '?' + query : '');
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--window-size=1280,720', '--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'], defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
page.on('console', m => { const t = m.text(); if (!/GPU stall|Download the React/.test(t)) console.log('[' + m.type() + ']', t.slice(0, 600)); });
page.on('pageerror', e => console.log('[pageerror]', (e.stack || e.message).slice(0, 900)));
await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(waitExpr || 'window.DONE===true', { timeout: 180000, polling: 250 }).catch(e => console.log('wait timeout'));
if (evalAfter) { const r = await page.evaluate(evalAfter).catch(e => 'EVAL ERR ' + e.message); if (r !== undefined) console.log('eval:', typeof r === 'string' ? r : JSON.stringify(r)); }
await page.screenshot({ path: out });
await browser.close();
