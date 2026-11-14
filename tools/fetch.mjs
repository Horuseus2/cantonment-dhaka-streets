import fs from 'node:fs';
const bbox = '23.7740,90.3790,23.8340,90.4130';
const parts = {
  roads: `way[highway];way[railway];way[aeroway];`,
  buildings: `way[building];relation[building];`,
  areas: `way[landuse];way[leisure];way[natural];way[waterway];way[amenity];way[military];relation[natural=water];relation[landuse];relation[leisure];`,
  pois: `node[amenity];node[shop];node[highway=bus_stop];node[highway=traffic_signals];node[tourism];node[office];node[place];node[railway=station];node[military];node[leisure];node[historic];`
};
const eps = ['https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const [name, body] of Object.entries(parts)) {
  const out = new URL(`./osm_${name}.json`, import.meta.url);
  if (fs.existsSync(out)) { console.log(name, 'cached'); continue; }
  const q = `[out:json][timeout:90][bbox:${bbox}];(${body});out body geom qt;`;
  let done = false, wait = 4000;
  for (let attempt = 0; attempt < 8 && !done; attempt++) {
    for (const ep of eps) {
      try {
        const r = await fetch(ep, {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'osm-game-builder/1.0'}, body:'data='+encodeURIComponent(q), signal: AbortSignal.timeout(100000)});
        if (!r.ok) { console.log(name, ep, r.status); continue; }
        const t = await r.text();
        if (!t.trim().startsWith('{')) { console.log(name, ep, 'non-json'); continue; }
        const j = JSON.parse(t);
        if (!j.elements || !j.elements.length) { console.log(name, ep, 'empty', (j.remark||'')); continue; }
        fs.writeFileSync(out, t);
        console.log(name, 'saved', t.length, 'elements', j.elements.length, 'from', ep);
        done = true; break;
      } catch (e) { console.log(name, ep, 'err', e.message); }
    }
    if (!done) { await sleep(wait); wait = Math.min(wait * 2, 40000); }
  }
  if (!done) console.log(name, 'FAILED');
}
