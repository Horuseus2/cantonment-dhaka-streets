// Converts raw OpenStreetMap extracts (osm_*.json) into the compact game map (../data/map.js).
// Run: node build-map.mjs
import fs from 'node:fs';

const LAT0 = 23.8040, LON0 = 90.3960;
const BB = { s: 23.7740, w: 90.3790, n: 23.8340, e: 90.4130 };
const KX = Math.cos(LAT0 * Math.PI / 180) * 111320, KZ = 110574;
const mx = lon => (lon - LON0) * KX;
const mz = lat => -(lat - LAT0) * KZ;
const BOUNDS = { minX: mx(BB.w), maxX: mx(BB.e), minZ: mz(BB.n), maxZ: mz(BB.s) };
const MARGIN = 60;
const inB = (x, z, m = MARGIN) => x > BOUNDS.minX - m && x < BOUNDS.maxX + m && z > BOUNDS.minZ - m && z < BOUNDS.maxZ + m;

const load = n => JSON.parse(fs.readFileSync(new URL(`./osm_${n}.json`, import.meta.url))).elements;
const roadsRaw = load('roads'), bldRaw = load('buildings'), areasRaw = load('areas'), poisRaw = load('pois');

const nameOf = t => { if (!t) return ''; let n = t['name:en'] || t.name || ''; return n.replace(/[–—]/g, '-').trim(); };
const hash = n => { let x = (n | 0) ^ 0x9e3779b9; x = Math.imul(x ^ (x >>> 16), 0x85ebca6b); x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35); return (x ^ (x >>> 16)) >>> 0; };
const r1 = v => Math.round(v * 10); // decimetres

// ---------- geometry helpers ----------
function polyArea(p) { let a = 0; for (let i = 0, n = p.length; i < n; i++) { const q = p[(i + 1) % n]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; }
function centroid(p) { let x = 0, z = 0; for (const q of p) { x += q[0]; z += q[1]; } return [x / p.length, z / p.length]; }
function pip(x, z, p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const a = p[i], b = p[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function segClosest(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az; const l2 = dx * dx + dz * dz; let t = l2 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0; t = Math.max(0, Math.min(1, t)); const x = ax + dx * t, z = az + dz * t; return [x, z, Math.hypot(px - x, pz - z), t]; }
function simplify(p, tol) {
  if (p.length <= 4) return p;
  const keep = new Uint8Array(p.length); keep[0] = keep[p.length - 1] = 1;
  const st = [[0, p.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    for (let i = a + 1; i < b; i++) { const d = segClosest(p[i][0], p[i][1], p[a][0], p[a][1], p[b][0], p[b][1])[2]; if (d > md) { md = d; mi = i; } }
    if (md > tol) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return p.filter((_, i) => keep[i]);
}
function ringFromGeom(g) {
  if (!g || g.length < 4) return null;
  let p = g.map(q => [mx(q.lon), mz(q.lat)]);
  const f = p[0], l = p[p.length - 1];
  if (Math.hypot(f[0] - l[0], f[1] - l[1]) > 0.5) return null;
  p.pop();
  return p;
}
function cleanRing(p, tol) {
  p = simplify([...p, p[0]], tol); p.pop();
  const out = [];
  for (const q of p) { const l = out[out.length - 1]; if (!l || Math.hypot(l[0] - q[0], l[1] - q[1]) > 0.25) out.push(q); }
  if (out.length < 3) return null;
  if (polyArea(out) < 0) out.reverse(); // enforce consistent winding (positive area in x,z)
  return out;
}
function enc(p) { const o = []; let px = 0, pz = 0; for (const q of p) { const x = r1(q[0]), z = r1(q[1]); o.push(x - px, z - pz); px = x; pz = z; } return o; }
function stitch(ways) { // stitch open ways into closed rings
  const rings = []; const segs = ways.map(w => w.map(q => [mx(q.lon), mz(q.lat)])).filter(s => s.length > 1);
  while (segs.length) {
    let cur = segs.pop(); let guard = 0;
    while (Math.hypot(cur[0][0] - cur[cur.length - 1][0], cur[0][1] - cur[cur.length - 1][1]) > 0.5 && guard++ < 500) {
      const e = cur[cur.length - 1]; let found = -1, rev = false;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (Math.hypot(s[0][0] - e[0], s[0][1] - e[1]) < 0.5) { found = i; break; }
        if (Math.hypot(s[s.length - 1][0] - e[0], s[s.length - 1][1] - e[1]) < 0.5) { found = i; rev = true; break; }
      }
      if (found < 0) break;
      let s = segs.splice(found, 1)[0]; if (rev) s.reverse(); cur = cur.concat(s.slice(1));
    }
    if (cur.length > 3 && Math.hypot(cur[0][0] - cur[cur.length - 1][0], cur[0][1] - cur[cur.length - 1][1]) <= 0.5) { cur.pop(); rings.push(cur); }
  }
  return rings;
}
class Grid {
  constructor(cs) { this.cs = cs; this.m = new Map(); }
  key(i, j) { return i * 100003 + j; }
  add(x0, z0, x1, z1, v) { const c = this.cs; for (let i = Math.floor(Math.min(x0, x1) / c); i <= Math.floor(Math.max(x0, x1) / c); i++) for (let j = Math.floor(Math.min(z0, z1) / c); j <= Math.floor(Math.max(z0, z1) / c); j++) { const k = this.key(i, j); let a = this.m.get(k); if (!a) this.m.set(k, a = []); a.push(v); } }
  q(x, z, r) { const c = this.cs, out = new Set(); for (let i = Math.floor((x - r) / c); i <= Math.floor((x + r) / c); i++) for (let j = Math.floor((z - r) / c); j <= Math.floor((z + r) / c); j++) { const a = this.m.get(this.key(i, j)); if (a) for (const v of a) out.add(v); } return out; }
}

// ---------- zones ----------
const canttPolys = [];
for (const e of areasRaw) {
  if (e.tags?.landuse === 'military' || e.tags?.military) {
    if (e.type === 'way') { const r = ringFromGeom(e.geometry); if (r) canttPolys.push(r); }
    else if (e.members) for (const r of stitch(e.members.filter(m => m.geometry && m.role !== 'inner').map(m => m.geometry))) canttPolys.push(r);
  }
}
const inCantt = (x, z) => canttPolys.some(p => pip(x, z, p));
const COMM = [[23.7805, 90.4005, 520], [23.7935, 90.4045, 650], [23.7790, 90.4070, 450]].map(c => [mx(c[1]), mz(c[0]), c[2]]);
const inComm = (x, z) => COMM.some(c => Math.hypot(x - c[0], z - c[1]) < c[2]);
const SLUM = [[23.7863, 90.4091, 420], [23.8208, 90.3806, 330], [23.8125, 90.3885, 260]].map(c => [mx(c[1]), mz(c[0]), c[2]]);
const inSlum = (x, z) => SLUM.some(c => Math.hypot(x - c[0], z - c[1]) < c[2]);

// ---------- roads ----------
const DRIVE = { motorway: 0, trunk: 1, primary: 2, secondary: 3, tertiary: 4, unclassified: 5, residential: 5, living_street: 6, service: 7, road: 5, motorway_link: 8, trunk_link: 8, primary_link: 8, secondary_link: 8, tertiary_link: 8 };
const FOOT = { footway: 9, path: 9, pedestrian: 9, steps: 10, cycleway: 9, track: 9 };
const WIDTH = [11, 11, 10.5, 9, 7.5, 6, 4.6, 3.8, 6, 2.2, 2.2];
const nodeIdx = new Map(); const nodes = []; // [x,z,h]
const nodeGround = [], nodeWant = [];
function nid(id, lon, lat) { let i = nodeIdx.get(id); if (i === undefined) { i = nodes.length; nodeIdx.set(id, i); nodes.push([mx(lon), mz(lat), 0]); nodeGround.push(false); nodeWant.push(0); } return i; }
const roads = [];
for (const e of roadsRaw) {
  const t = e.tags || {}; const hw = t.highway; if (!hw || e.type !== 'way' || !e.geometry) continue;
  if (t.area === 'yes') continue;
  let ty = DRIVE[hw]; if (ty === undefined) ty = FOOT[hw]; if (ty === undefined) continue;
  if (t.access === 'no' && ty >= 9) continue;
  const lanes = parseInt(t.lanes) || 0;
  const oneway = (t.oneway === 'yes' || hw === 'motorway' || t.junction === 'roundabout') ? 1 : 0;
  let w = WIDTH[ty];
  if (lanes && ty < 9) w = Math.max(3.6, Math.min(16, lanes * 3.4 + 0.8));
  else if (oneway && ty <= 2) w = 9;
  let layer = parseInt(t.layer) || 0; const bridge = !!t.bridge && t.bridge !== 'no';
  if (bridge && layer < 1) layer = 1;
  if (t.tunnel || layer < 0) layer = 0;
  layer = Math.min(layer, 3);
  // split into runs inside bounds
  let run = [];
  const flush = () => { if (run.length > 1) roads.push({ t: ty, n: nameOf(t), w: Math.round(w * 10) / 10, o: oneway, L: layer, k: run, steps: hw === 'steps' }); run = []; };
  for (let i = 0; i < e.geometry.length; i++) {
    const g = e.geometry[i]; const x = mx(g.lon), z = mz(g.lat);
    if (!inB(x, z, 150)) { flush(); continue; }
    run.push(nid(e.nodes[i], g.lon, g.lat));
  }
  flush();
}
// elevation of bridges / flyovers
const HL = 5.6;
for (const r of roads) for (const k of r.k) { if (r.L > 0) nodeWant[k] = Math.max(nodeWant[k], r.L * HL); else if (!r.steps) nodeGround[k] = true; }
for (let i = 0; i < nodes.length; i++) nodes[i][2] = nodeGround[i] ? 0 : nodeWant[i];
for (let it = 0; it < 400; it++) {
  let ch = false;
  for (const r of roads) {
    if (r.L <= 0 && !r.steps) continue;
    const sl = r.steps ? 0.7 : (r.t >= 9 ? 0.5 : 0.065);
    for (let i = 0; i + 1 < r.k.length; i++) {
      const a = nodes[r.k[i]], b = nodes[r.k[i + 1]]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]) * sl;
      if (a[2] > b[2] + d + 0.01) { a[2] = b[2] + d; ch = true; }
      if (b[2] > a[2] + d + 0.01) { b[2] = a[2] + d; ch = true; }
    }
  }
  if (!ch) break;
}
// segment grid for nearest-road queries
const segGrid = new Grid(60);
roads.forEach((r, ri) => { for (let i = 0; i + 1 < r.k.length; i++) { const a = nodes[r.k[i]], b = nodes[r.k[i + 1]]; segGrid.add(a[0], a[1], b[0], b[1], [ri, i]); } });
function nearestRoad(x, z, rad = 90, maxType = 10) {
  let best = null;
  for (const [ri, i] of segGrid.q(x, z, rad)) {
    const r = roads[ri]; if (r.t > maxType || r.L > 0) continue;
    const a = nodes[r.k[i]], b = nodes[r.k[i + 1]]; const c = segClosest(x, z, a[0], a[1], b[0], b[1]);
    if (!best || c[2] < best.d) best = { d: c[2], x: c[0], z: c[1], ri, i };
  }
  return best;
}

// ---------- buildings ----------
const buildings = []; const bGrid = new Grid(50);
function addBuilding(geom, t, id) {
  let ring = ringFromGeom(geom); if (!ring) return;
  ring = cleanRing(ring, 0.35); if (!ring) return;
  const area = Math.abs(polyArea(ring)); if (area < 9) return;
  const [cx, cz] = centroid(ring); if (!inB(cx, cz, 0)) return;
  const h = hash(id); const cantt = inCantt(cx, cz), comm = inComm(cx, cz), slum = inSlum(cx, cz);
  const bt = t.building || 'yes';
  let f = parseInt(t['building:levels']);
  if (!(f > 0)) {
    if (area < 25) f = 1;
    else if (area < 60) f = slum ? 1 : 1 + h % 3;
    else if (area < 150) f = cantt ? 1 + h % 3 : slum ? 1 + h % 2 : 3 + h % 4;
    else if (area < 400) f = cantt ? 2 + h % 4 : comm ? 6 + h % 10 : 5 + h % 4;
    else if (area < 1200) f = cantt ? 2 + h % 3 : comm ? 8 + h % 14 : 4 + h % 6;
    else f = comm ? 6 + h % 12 : 2 + h % 4;
    if (bt === 'house' || bt === 'detached') f = 1 + h % 2;
    if (bt === 'shed' || bt === 'roof' || bt === 'garage' || bt === 'cowshed' || bt === 'stable') f = 1;
    if (bt === 'hangar') f = 3;
    if (bt === 'apartments') f = Math.max(f, 5 + h % 5);
  }
  f = Math.min(f, 30);
  // style: 0 apartment, 1 commercial glass, 2 tin shed, 3 institutional/cantt, 4 brick, 5 industrial, 6 mosque, 7 construction
  let s = 0;
  const am = t.amenity || '';
  if (bt === 'mosque' || am === 'place_of_worship') s = 6;
  else if (bt === 'construction') s = 7;
  else if (bt === 'hangar' || bt === 'industrial' || bt === 'warehouse') s = 5;
  else if (bt === 'shed' || bt === 'roof' || (area < 45 && f === 1 && (slum || h % 3 === 0))) s = 2;
  else if (bt === 'commercial' || bt === 'office' || bt === 'retail' || (comm && f >= 7)) s = 1;
  else if (cantt || ['school', 'college', 'university', 'hospital', 'public', 'government'].includes(bt)) s = 3;
  else if (h % 5 === 0) s = 4;
  if (s === 2) f = 1;
  const b = { f, s, ring, cx, cz, area, n: nameOf(t), tags: t, shop: 0 };
  const bi = buildings.length; buildings.push(b);
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const q of ring) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); }
  bGrid.add(x0, z0, x1, z1, bi);
}
for (const e of bldRaw) {
  if (e.type === 'way') addBuilding(e.geometry, e.tags || {}, e.id);
  else if (e.members) for (const m of e.members) if (m.geometry && m.role !== 'inner') addBuilding(m.geometry, e.tags || {}, e.id + m.ref % 1000);
}
function buildingAt(x, z, rad) {
  let best = -1, bd = rad;
  for (const bi of bGrid.q(x, z, rad)) {
    const b = buildings[bi]; if (pip(x, z, b.ring)) return bi;
    for (let i = 0; i < b.ring.length; i++) { const a = b.ring[i], c = b.ring[(i + 1) % b.ring.length]; const d = segClosest(x, z, a[0], a[1], c[0], c[1])[2]; if (d < bd) { bd = d; best = bi; } }
  }
  return best;
}
function doorFor(bi, tx, tz) { // door on building edge nearest to target point; returns [x,z,nx,nz]
  const b = buildings[bi]; let best = null;
  for (let i = 0; i < b.ring.length; i++) {
    const a = b.ring[i], c = b.ring[(i + 1) % b.ring.length]; const len = Math.hypot(c[0] - a[0], c[1] - a[1]); if (len < 1.6) continue;
    const s = segClosest(tx, tz, a[0], a[1], c[0], c[1]);
    let t = Math.max(0.9 / len, Math.min(1 - 0.9 / len, s[3]));
    const x = a[0] + (c[0] - a[0]) * t, z = a[1] + (c[1] - a[1]) * t; const d = Math.hypot(tx - x, tz - z);
    if (!best || d < best.d) { let nx = (c[1] - a[1]) / len, nz = -(c[0] - a[0]) / len; if (pip(x + nx * 0.4, z + nz * 0.4, b.ring)) { nx = -nx; nz = -nz; } best = { d, x, z, nx, nz }; }
  }
  return best;
}

// ---------- areas ----------
const areas = [];
function areaType(t) {
  if (t.natural === 'water' || t.waterway === 'riverbank' || t.leisure === 'swimming_pool' || t.landuse === 'reservoir' || t.landuse === 'basin') return 'water';
  if (t.natural === 'wood' || t.landuse === 'forest') return 'wood';
  if (t.leisure === 'park' || t.leisure === 'garden' || t.landuse === 'grass' || t.landuse === 'meadow' || t.natural === 'grassland' || t.landuse === 'recreation_ground' || t.landuse === 'village_green' || t.natural === 'heath') return 'park';
  if (t.leisure === 'pitch' || t.leisure === 'playground' || t.leisure === 'stadium' || t.leisure === 'track' || t.landuse === 'playground') return 'pitch';
  if (t.leisure === 'golf_course') return 'golf';
  if (t.natural === 'sand') return 'sand';
  if (t.landuse === 'cemetery' || t.amenity === 'grave_yard') return 'cemetery';
  if (t.amenity === 'parking' || t.amenity === 'bus_station') return 'paved';
  if (t.natural === 'wetland') return 'wetland';
  return null;
}
function addArea(ring, type, name) {
  ring = cleanRing(ring, 0.6); if (!ring) return;
  const a = Math.abs(polyArea(ring)); if (a < 20) return;
  const [cx, cz] = centroid(ring);
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const q of ring) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); }
  if (x1 < BOUNDS.minX - 100 || x0 > BOUNDS.maxX + 100 || z1 < BOUNDS.minZ - 100 || z0 > BOUNDS.maxZ + 100) return;
  areas.push({ t: type, n: name, ring, a });
}
const treeRows = []; const waterways = [];
const amenityPolys = [];
for (const e of areasRaw) {
  const t = e.tags || {};
  if (e.type === 'way' && e.geometry) {
    if (t.natural === 'tree_row') { treeRows.push(e.geometry.map(g => [mx(g.lon), mz(g.lat)])); continue; }
    if (t.waterway && !ringFromGeom(e.geometry)) { waterways.push({ w: t.waterway === 'canal' ? 9 : 3.5, p: e.geometry.map(g => [mx(g.lon), mz(g.lat)]) }); continue; }
    const ty = areaType(t); const ring = ringFromGeom(e.geometry);
    if (ty && ring) addArea(ring, ty, nameOf(t));
    if (ring && t.amenity && nameOf(t)) amenityPolys.push({ t, ring });
  } else if (e.type === 'relation' && e.members) {
    const ty = areaType(t); if (!ty) continue;
    for (const r of stitch(e.members.filter(m => m.geometry && m.role !== 'inner').map(m => m.geometry))) addArea(r, ty, nameOf(t));
  }
}
areas.sort((a, b) => b.a - a.a);

// rail + aero
const rails = [], aero = [], helipads = [];
for (const e of roadsRaw) {
  const t = e.tags || {}; if (e.type !== 'way' || !e.geometry) continue;
  if (t.railway === 'rail') { const p = e.geometry.map(g => [mx(g.lon), mz(g.lat)]).filter(q => inB(q[0], q[1], 200)); if (p.length > 1) rails.push(p); }
  if (t.aeroway === 'runway' || t.aeroway === 'taxiway') { const p = e.geometry.map(g => [mx(g.lon), mz(g.lat)]).filter(q => inB(q[0], q[1], 200)); if (p.length > 1) aero.push({ t: t.aeroway === 'runway' ? 0 : 1, w: t.aeroway === 'runway' ? 46 : 18, p }); }
  if (t.aeroway === 'apron') { const r = ringFromGeom(e.geometry); if (r) addArea(r, 'paved', nameOf(t)); }
  if (t.aeroway === 'helipad') { const r = ringFromGeom(e.geometry); if (r) { const c = centroid(r); helipads.push([r1(c[0]), r1(c[1])]); } }
}

// ---------- POIs ----------
const SHOPCAT = { clothes: 'clothes', tailor: 'clothes', shoes: 'clothes', boutique: 'clothes', fashion: 'clothes', hairdresser: 'barber', beauty: 'barber', cosmetics: 'barber', tea: 'tea', bakery: 'food', confectionery: 'food', pastry: 'food', chemist: 'pharmacy', medical_supply: 'pharmacy', car_repair: 'garage', car_parts: 'garage', motorcycle: 'garage', car: 'garage', jewelry: 'jewelry' };
const AMCAT = { restaurant: 'food', fast_food: 'food', cafe: 'food', food_court: 'food', pharmacy: 'pharmacy', hospital: 'hospital', clinic: 'hospital', doctors: 'hospital', dentist: 'hospital', bank: 'bank', atm: 'atm', place_of_worship: 'mosque', school: 'school', college: 'school', university: 'school', kindergarten: 'school', police: 'police', fuel: 'fuel', community_centre: 'public', cinema: 'public', theatre: 'public', library: 'public', post_office: 'public', marketplace: 'store', bar: 'food', events_venue: 'public', conference_centre: 'public' };
const SKIPSHOP = new Set(['yes', 'vacant', 'bookmaker']);
function catOf(t) {
  if (t.shop) { if (SHOPCAT[t.shop]) return SHOPCAT[t.shop]; return 'store'; }
  if (t.amenity && AMCAT[t.amenity]) { if (t.amenity === 'place_of_worship' && t.religion && t.religion !== 'muslim') return 'temple'; return AMCAT[t.amenity]; }
  if (t.tourism === 'hotel' || t.tourism === 'guest_house') return 'hotel';
  if (t.office) return 'office';
  return null;
}
const DEFNAME = { food: 'Restaurant', tea: 'Tea Stall', store: 'General Store', clothes: 'Clothing Store', barber: 'Salon', pharmacy: 'Pharmacy', hospital: 'Clinic', bank: 'Bank', atm: 'ATM Booth', mosque: 'Jame Masjid', temple: 'Temple', school: 'School', police: 'Police Station', fuel: 'Filling Station', garage: 'Motor Garage', hotel: 'Hotel', office: 'Office', public: 'Community Hall', jewelry: 'Jewellers' };
const STOREKIND = { general: 'General Store', supermarket: 'Super Shop', convenience: 'Convenience Store', department_store: 'Department Store', variety_store: 'Variety Store', greengrocer: 'Vegetable Shop', butcher: 'Meat Shop', seafood: 'Fish Shop', furniture: 'Furniture', electronics: 'Electronics', electrical: 'Electric Store', mobile_phone: 'Mobile Shop', mobile_recharge: 'Flexiload', hardware: 'Hardware', houseware: 'Crockeries', optician: 'Optics', photo: 'Photo Studio', laundry: 'Laundry', travel_agency: 'Travel Agency', gift: 'Gift Shop', trade: 'Traders', bed: 'Bedding Store' };
const pois = []; const poiGrid = new Grid(40);
function addPoi(cat, name, x, z, kind) {
  if (!inB(x, z, -8)) return;
  name = (name || '').slice(0, 44);
  for (const pi of poiGrid.q(x, z, 14)) { const p = pois[pi]; if (p.c === cat && (p.n === name || !name) && Math.hypot(p.px - x, p.pz - z) < 14) return; }
  const bi = buildingAt(x, z, 22);
  const p = { c: cat, n: name || kind || DEFNAME[cat] || 'Shop', px: x, pz: z, b: bi };
  if (bi >= 0) {
    const nr = nearestRoad(x, z, 120) || { x, z };
    const inside = pip(x, z, buildings[bi].ring);
    const d = doorFor(bi, inside ? nr.x : x, inside ? nr.z : z); if (!d) return;
    // keep doors apart
    for (const pi of poiGrid.q(d.x, d.z, 4)) { const q = pois[pi]; if (Math.hypot(q.x - d.x, q.z - d.z) < 2.4) { // slide along: try target offset
      const d2 = doorFor(bi, x + (hash(pois.length) % 9 - 4) * 2, z + (hash(pois.length * 7) % 9 - 4) * 2); if (d2) Object.assign(d, d2); break; } }
    for (const pi of poiGrid.q(d.x, d.z, 4)) { const q = pois[pi]; if (Math.hypot(q.x - d.x, q.z - d.z) < 2.0) return; }
    p.x = d.x + d.nx * 0.05; p.z = d.z + d.nz * 0.05; p.nx = d.nx; p.nz = d.nz;
    if (['food', 'store', 'clothes', 'barber', 'pharmacy', 'jewelry', 'bank', 'tea', 'garage'].includes(cat)) buildings[bi].shop = 1;
  } else {
    p.x = x; p.z = z; const nr = nearestRoad(x, z, 80);
    let nx = 0, nz = 1; if (nr && nr.d > 0.5) { nx = (nr.x - x) / nr.d; nz = (nr.z - z) / nr.d; }
    p.nx = nx; p.nz = nz; p.kiosk = 1;
  }
  poiGrid.add(p.x, p.z, p.x, p.z, pois.length); pois.push(p);
}
const stops = [], signals = [], places = [], checkpoints = [], aircraft = [];
for (const e of poisRaw) {
  const t = e.tags || {}; const x = mx(e.lon), z = mz(e.lat);
  if (t.highway === 'bus_stop' || t.amenity === 'bus_station') { if (inB(x, z, -20)) stops.push({ n: nameOf(t).replace(/,?\s*bus\s*(stop|station|stopage)\b/ig, '').replace(/\s+,/g, ',').trim() || '', x, z }); continue; }
  if (t.highway === 'traffic_signals') { signals.push([r1(x), r1(z)]); continue; }
  if (t.place) { if (nameOf(t) && inB(x, z, 0)) places.push({ n: nameOf(t), x: r1(x), z: r1(z), k: t.place === 'suburb' ? 1 : 0 }); continue; }
  if (t.military === 'checkpoint') { checkpoints.push({ n: nameOf(t), x, z }); continue; }
  if (t.historic === 'aircraft') { if (inB(x, z, 0)) aircraft.push([r1(x), r1(z), hash(e.id) % 628]); continue; }
  if (t.shop && SKIPSHOP.has(t.shop)) continue;
  const c = catOf(t); if (!c) continue;
  addPoi(c, nameOf(t), x, z, t.shop ? STOREKIND[t.shop] : null);
}
for (const b of buildings) { if (b.n && (b.tags.amenity || b.tags.shop || b.tags.tourism || b.tags.office)) { const c = catOf(b.tags); if (c) addPoi(c, b.n, b.cx, b.cz); } }
for (const a of amenityPolys) { const c = catOf(a.t); if (c) { const [cx, cz] = centroid(a.ring); addPoi(c, nameOf(a.t), cx, cz); } }

// special game locations anchored to real places
function nearestBuildingWhere(lat, lon, pred, rad = 260) {
  const x = mx(lon), z = mz(lat); let best = -1, bd = 1e9;
  for (const bi of bGrid.q(x, z, rad)) { const b = buildings[bi]; if (!pred(b, bi)) continue; const d = Math.hypot(b.cx - x, b.cz - z); if (d < bd) { bd = d; best = bi; } }
  return best;
}
const hasDoor = new Set(pois.filter(p => p.b >= 0).map(p => p.b));
function special(cat, name, lat, lon, pred) {
  const bi = nearestBuildingWhere(lat, lon, (b, i) => !hasDoor.has(i) && b.area > 70 && b.area < 900 && (pred ? pred(b) : true) && (nearestRoad(b.cx, b.cz, 45, 8) != null));
  if (bi < 0) { console.log('no building for', name); return; }
  const b = buildings[bi]; hasDoor.add(bi); const before = pois.length; addPoi(cat, name, b.cx, b.cz);
  if (pois.length === before) console.log('failed to place', name); else { pois[pois.length - 1].sp = 1; if (cat !== 'home' && cat !== 'property') b.shop = 1; }
}
const civ = b => !inCantt(b.cx, b.cz);
special('gunshop', 'Kachukhet Arms & Ammunition', 23.7925, 90.3885, civ);
special('gunshop', 'Mohakhali Gun House', 23.7800, 90.3995, civ);
special('gunshop', 'Banani Shooters Point', 23.7940, 90.4040, civ);
special('gunshop', 'Mirpur 14 Arms Traders', 23.7988, 90.3850, civ);
special('gunshop', 'Matikata Firearms Store', 23.8190, 90.3950, civ);
special('gunshop', 'Manikdi Armoury', 23.8262, 90.3918, civ);
special('cardealer', 'Kakoli Car Point', 23.7950, 90.4025, civ);
special('cardealer', 'Mohakhali Motors', 23.7812, 90.4010, civ);
special('cardealer', 'ECB Auto Gallery', 23.8226, 90.3930, civ);
special('cardealer', 'Kachukhet Car Bazar', 23.7912, 90.3870, civ);
special('home', 'Your Flat, Nirjhor', 23.8082, 90.3932, null);
special('property', 'Mohakhali DOHS Apartment', 23.7815, 90.3955, null);
special('property', 'Banani DOHS House', 23.7925, 90.3985, null);
special('property', 'Kachukhet Rooftop Flat', 23.7958, 90.3878, civ);
special('property', 'Matikata Family Flat', 23.8172, 90.3940, civ);
special('property', 'Manikdi Lake View Flat', 23.8255, 90.3925, civ);
special('property', 'Banani Road 11 Penthouse', 23.7905, 90.4065, civ);
// Boys Club residences: 15 real houses inside the cantonment (army officers get bungalows, the rest duplexes)
{
  const ARMY = new Set([2, 3, 7, 8, 12]); const cxm = mx(90.3990), czm = mz(23.8060);
  const cand = [];
  buildings.forEach((b, bi) => { if (hasDoor.has(bi) || b.area < 120 || b.area > 480 || !inCantt(b.cx, b.cz) || b.s === 2 || b.s === 6) return; const nr = nearestRoad(b.cx, b.cz, 38, 7); if (!nr) return; cand.push([Math.hypot(b.cx - cxm, b.cz - czm), bi]); });
  cand.sort((a, b) => a[0] - b[0]); const chosen = [];
  for (const [d, bi] of cand) { const b = buildings[bi]; if (chosen.some(c => Math.hypot(buildings[c].cx - b.cx, buildings[c].cz - b.cz) < 70)) continue; chosen.push(bi); if (chosen.length === 15) break; }
  // Irtiza (4, navy officer): a house on a lake shore with a dock for his patrol boat
  const lakes = areas.filter(a => a.t === 'water' && a.a > 14000);
  let lakeBest = null;
  buildings.forEach((b, bi) => {
    if (hasDoor.has(bi) || chosen.includes(bi) || b.area < 110 || b.area > 520 || b.s === 2 || b.s === 6) return; if (!nearestRoad(b.cx, b.cz, 45, 7)) return;
    for (const L of lakes) { let bd = 1e9, sx = 0, sz = 0; const r = L.ring; for (let i = 0; i < r.length; i++) { const a = r[i], c = r[(i + 1) % r.length], q = segClosest(b.cx, b.cz, a[0], a[1], c[0], c[1]); if (q[2] < bd) { bd = q[2]; sx = q[0]; sz = q[1]; } }
      if (bd > 34 || bd < 6 || pip(b.cx, b.cz, r)) continue; const dx = (sx - b.cx) / bd, dz = (sz - b.cz) / bd; let ok = true; for (const k of [4, 9, 16, 26]) if (!pip(sx + dx * k, sz + dz * k, r)) ok = false; if (!ok) continue;
      // nothing built between the house and the water
      let clear = true; for (let k = Math.sqrt(b.area) * 0.75; k < bd + 10; k += 2) { const bi2 = buildingAt(b.cx + dx * k, b.cz + dz * k, 0.01); if (bi2 >= 0 && bi2 !== bi && pip(b.cx + dx * k, b.cz + dz * k, buildings[bi2].ring)) clear = false; } if (!clear) continue;
      const score = Math.hypot(b.cx - cxm, b.cz - czm) + (inCantt(b.cx, b.cz) ? 0 : 500) - Math.min(L.a, 120000) / 30; if (!lakeBest || score < lakeBest.score) lakeBest = { score, bi, sx, sz, dx, dz, lake: L }; }
  });
  let dock = null;
  if (lakeBest) { chosen[4] = lakeBest.bi; dock = { sx: lakeBest.sx, sz: lakeBest.sz, dx: lakeBest.dx, dz: lakeBest.dz }; console.log('lake house for Irtiza: lake area', Math.round(lakeBest.lake.a), lakeBest.lake.n, 'shore dist', Math.round(Math.hypot(lakeBest.sx - buildings[lakeBest.bi].cx, lakeBest.sz - buildings[lakeBest.bi].cz))); } else console.log('NO LAKE HOUSE FOUND');
  // Sifar (14): an empty plot beside a road for a walled villa compound
  const VW = 64, VD = 58; let villa = null; const noGo = areas.filter(a => ['pitch', 'golf', 'park', 'cemetery', 'water', 'paved', 'wetland', 'sand'].includes(a.t));
  const freeAt = (x, z) => { if (!inCantt(x, z)) return false; for (const bi of bGrid.q(x, z, 3)) { const b = buildings[bi]; if (pip(x, z, b.ring)) return false; for (let i = 0; i < b.ring.length; i++) { const a = b.ring[i], c = b.ring[(i + 1) % b.ring.length]; if (segClosest(x, z, a[0], a[1], c[0], c[1])[2] < 3) return false; } } const nr = nearestRoad(x, z, 14, 10); if (nr && nr.d < roads[nr.ri].w / 2 + 3) return false; for (const a of noGo) if (pip(x, z, a.ring)) return false; for (const a of aero) for (let i = 0; i + 1 < a.p.length; i++) if (segClosest(x, z, a.p[i][0], a.p[i][1], a.p[i + 1][0], a.p[i + 1][1])[2] < a.w / 2 + 6) return false; return true; };
  roads.forEach((r, ri) => {
    if (r.t < 3 || r.t > 5 || r.L > 0 || r.w < 5) return;
    for (let i = 0; i + 1 < r.k.length; i++) { const A = nodes[r.k[i]], B = nodes[r.k[i + 1]]; let dx = B[0] - A[0], dz = B[1] - A[1]; const l = Math.hypot(dx, dz); if (l < 18) continue; dx /= l; dz /= l; const mxr = (A[0] + B[0]) / 2, mzr = (A[1] + B[1]) / 2;
      for (const sd of [1, -1]) { const nx = dz * sd, nz = -dx * sd, off = r.w / 2 + 6 + VD / 2, cx = mxr + nx * off, cz = mzr + nz * off; const dist = Math.hypot(cx - cxm, cz - czm); if (villa && dist >= villa.dist) continue;
        let ok = true; for (let u = -VW / 2 - 3; u <= VW / 2 + 3 && ok; u += 4) for (let v = -VD / 2 - 3; v <= VD / 2 + 3; v += 4) { if (!freeAt(cx + dx * u - nx * v, cz + dz * u - nz * v)) { ok = false; break; } } if (!ok) continue;
        // the verge between the plot and the road must also be clear of buildings
        villa = { dist, x: cx, z: cz, nx: -nx, nz: -nz, w: VW, d: VD, rw: r.w, road: r.n }; } }
  });
  if (villa) console.log('villa plot', Math.round(villa.x), Math.round(villa.z), 'dist from centre', Math.round(villa.dist), 'road', villa.road); else console.log('NO VILLA PLOT FOUND');
  chosen.forEach((bi, i) => { if (i === 14 && villa) return; const b = buildings[bi]; hasDoor.add(bi); b.f = ARMY.has(i) ? 1 : 2; b.s = 3; const before = pois.length; addPoi('vip', String(i), b.cx, b.cz); if (pois.length === before) console.log('vip house failed', i); });
  console.log('vip houses', chosen.length);
  globalThis.SPECIAL = { dock: dock ? [r1(dock.sx), r1(dock.sz), Math.round(Math.atan2(dock.dx, dock.dz) * 1000)] : null, villa: villa ? { x: r1(villa.x), z: r1(villa.z), a: Math.round(Math.atan2(villa.nx, villa.nz) * 1000), w: villa.w, d: villa.d, rw: villa.rw } : null };
}
// random enterable residences
let houseCount = 0;
buildings.forEach((b, bi) => {
  if (hasDoor.has(bi) || (b.s !== 0 && b.s !== 4 && b.s !== 3) || b.area < 55 || b.area > 700) return;
  if (hash(bi * 31 + 7) % 11 !== 0) return;
  const nr = nearestRoad(b.cx, b.cz, 60); if (!nr) return;
  const before = pois.length; addPoi('house', b.n || (b.f > 3 ? 'Apartment Building' : 'Residence'), b.cx, b.cz); if (pois.length > before) houseCount++;
});
// garages need a road-side spot for vehicles
for (const p of pois) if (p.c === 'garage' || p.c === 'fuel' || p.c === 'cardealer' || p.c === 'vip' || p.c === 'home' || p.c === 'property') { const nr = nearestRoad(p.x, p.z, 80, 8); if (nr) { p.rx = r1(nr.x); p.rz = r1(nr.z); } }

// bus stops: snap to road, dedupe
const stopOut = [];
for (const s of stops) {
  const nr = nearestRoad(s.x, s.z, 40, 5); if (!nr) continue;
  if (stopOut.some(o => Math.hypot(o.x - s.x, o.z - s.z) < 45 && (o.n === s.n || !s.n))) continue;
  const place = places.map(p => [Math.hypot(p.x / 10 - s.x, p.z / 10 - s.z), p.n]).sort((a, b) => a[0] - b[0])[0];
  stopOut.push({ n: s.n || (place ? place[1] + ' Stop' : 'Bus Stop'), x: s.x, z: s.z, rx: nr.x, rz: nr.z });
}
// real cantonment gates
for (const g of [['Shaheed Jahangir Gate', 23.7757, 90.3899], ['Staff Road Gate', 23.8114, 90.4038], ['Sainik Club Gate', 23.7906, 90.3996], ['Kachukhet Gate', 23.7930, 90.3888], ['ECB Chattar Gate', 23.8224, 90.3940], ['MES Gate', 23.8166, 90.4046]]) checkpoints.push({ n: g[0], x: mx(g[2]), z: mz(g[1]), gate: 1 });
// checkpoints snap to road
const cpOut = [];
checkpoints.sort((a, b) => (b.gate || 0) - (a.gate || 0));
for (const c of checkpoints) { const nr = nearestRoad(c.x, c.z, c.gate ? 70 : 40, c.gate ? 4 : 8); if (nr && cpOut.some(o => Math.hypot(o.x / 10 - nr.x, o.z / 10 - nr.z) < 60)) continue; if (nr && inB(c.x, c.z, -10)) { const r = roads[nr.ri], a = nodes[r.k[nr.i]], b = nodes[r.k[nr.i + 1]]; cpOut.push({ n: c.n || 'Check Post', x: r1(nr.x), z: r1(nr.z), a: Math.round(Math.atan2(b[0] - a[0], b[1] - a[1]) * 100), w: r.w, g: c.gate ? 1 : 0 }); } }

// ---------- output ----------
const out = {
  origin: [LAT0, LON0], bounds: BOUNDS,
  nodes: nodes.flatMap(n => [r1(n[0]), r1(n[1]), r1(n[2])]),
  roads: roads.map(r => [r.t, r.w, r.o, r.L, r.n, r.k]),
  buildings: buildings.map(b => [b.f, b.s, b.shop, ...enc(b.ring)]),
  bnames: buildings.map((b, i) => b.n && b.area > 250 ? [i, b.n] : null).filter(Boolean),
  areas: areas.map(a => [a.t, a.n, enc(a.ring)]),
  cantt: canttPolys.map(p => enc(cleanRing(p, 2) || p)),
  treeRows: treeRows.map(enc), waterways: waterways.map(w => [w.w, enc(w.p)]),
  rails: rails.map(enc), aero: aero.map(a => [a.t, a.w, enc(a.p)]), helipads, aircraft,
  pois: pois.map(p => { const o = [p.c, p.n, r1(p.x), r1(p.z), Math.round(Math.atan2(p.nx, p.nz) * 100), p.b, p.kiosk ? 1 : 0]; if (p.rx !== undefined) o.push(p.rx, p.rz); return o; }),
  stops: stopOut.map(s => [s.n, r1(s.x), r1(s.z), r1(s.rx), r1(s.rz)]),
  signals, places, checkpoints: cpOut, special: globalThis.SPECIAL
};
fs.mkdirSync(new URL('../data/', import.meta.url), { recursive: true });
const js = 'window.MAPDATA=' + JSON.stringify(out) + ';';
fs.writeFileSync(new URL('../data/map.js', import.meta.url), js);
const cc = {}; for (const p of pois) cc[p.c] = (cc[p.c] || 0) + 1;
console.log('bounds', BOUNDS);
console.log('nodes', nodes.length, 'roads', roads.length, 'buildings', buildings.length, 'areas', areas.length, 'pois', pois.length, 'stops', stopOut.length, 'cantt polys', canttPolys.length, 'houses', houseCount);
console.log('elevated nodes', nodes.filter(n => n[2] > 0.5).length, 'max h', Math.max(...nodes.map(n => n[2])));
console.log('poi cats', cc);
console.log('kiosks', pois.filter(p => p.kiosk).length, 'rails', rails.length, 'aero', aero.length, 'checkpoints', cpOut.length, cpOut.map(c => c.n).join(','));
console.log('size MB', (js.length / 1e6).toFixed(2));
