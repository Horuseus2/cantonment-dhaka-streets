'use strict';
// Sky dome, sun/moon lighting, day-night cycle, weather (clouds, rain, storm, fog), reflections.
(function () {
  const G = window.G;
  const E = G.env = { time: 8.5, day: 0, timeScale: 1 / 120, night: 0, rain: 0, wet: 0, flash: 0, weather: 'clear', auto: true, windX: 1, windZ: 0.4 };
  const DAYS = ['Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  E.WEATHER = {
    clear: { label: 'Clear', cover: 0.14, oc: 0, rain: 0, fog: 0, wind: 0.6 },
    cloudy: { label: 'Partly Cloudy', cover: 0.5, oc: 0.15, rain: 0, fog: 0, wind: 1 },
    overcast: { label: 'Overcast', cover: 0.97, oc: 0.75, rain: 0, fog: 0.0004, wind: 1.2 },
    drizzle: { label: 'Drizzle', cover: 0.95, oc: 0.7, rain: 0.28, fog: 0.0006, wind: 1.2 },
    rain: { label: 'Monsoon Rain', cover: 1, oc: 0.88, rain: 0.75, fog: 0.0012, wind: 1.8 },
    storm: { label: 'Kalboishakhi Storm', cover: 1, oc: 1, rain: 1, fog: 0.0016, wind: 3.4 },
    fog: { label: 'Winter Fog', cover: 0.35, oc: 0.4, rain: 0, fog: 0.011, wind: 0.2 },
    haze: { label: 'Dusty Haze', cover: 0.2, oc: 0.12, rain: 0, fog: 0.0026, wind: 0.5 }
  };
  const NEXT = { clear: ['clear', 'clear', 'cloudy', 'haze', 'cloudy'], cloudy: ['clear', 'cloudy', 'overcast', 'drizzle'], overcast: ['cloudy', 'drizzle', 'rain', 'overcast'], drizzle: ['overcast', 'rain', 'cloudy'], rain: ['storm', 'drizzle', 'overcast', 'rain'], storm: ['rain', 'drizzle'], fog: ['haze', 'clear', 'cloudy'], haze: ['clear', 'cloudy', 'haze'] };
  const cur = { cover: 0.14, oc: 0, rain: 0, fog: 0, wind: 0.6 };
  const V3 = THREE.Vector3; const sunDir = new V3(), moonDir = new V3(), tmpC = new THREE.Color();
  const cz = new THREE.Color(), ch = new THREE.Color(), cs = new THREE.Color(), cl = new THREE.Color(), cd = new THREE.Color();

  const SKY_VS = 'varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }';
  const SKY_FS = `
  uniform vec3 uSun,uMoon,uZenith,uHorizon,uSunCol,uCloudLit,uCloudDark; uniform float uTime,uCover,uNight,uFlash,uSunI; varying vec3 vDir;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x), mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x), f.y); }
  float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*noise(p); p=p*2.03+vec2(17.,9.); a*=.5; } return s; }
  void main(){
    vec3 d = normalize(vDir); float y = max(d.y, 0.0);
    vec3 col = mix(uHorizon, uZenith, pow(y, 0.62));
    if(d.y<0.) col = mix(uHorizon, uHorizon*0.5, min(1., -d.y*5.));
    float sd = max(dot(d,uSun),0.);
    col += uSunCol * (pow(sd, 5.)*0.10 + pow(sd, 50.)*0.4) * uSunI;
    col += uSunCol * smoothstep(0.99935, 0.99975, sd) * 30. * uSunI;
    float md = max(dot(d,uMoon),0.); col += vec3(0.8,0.86,1.0) * (smoothstep(0.9995,0.9998,md)*2.2 + pow(md,160.)*0.12) * uNight;
    if(uNight>0.01 && d.y>0.){ vec2 sp = d.xz/(d.y+0.35)*210.; float h=hash(floor(sp)); float st = step(0.987,h)*smoothstep(0.45,0.05,length(fract(sp)-0.5)); col += vec3(st)*(0.6+0.4*sin(uTime*2.+h*40.))*uNight*1.3*smoothstep(0.,0.25,d.y); }
    if(d.y>0.004){
      vec2 uv = d.xz/(d.y+0.12)*1.5 + uTime*vec2(0.007,0.003);
      float n = fbm(uv), n2 = fbm(uv*2.7+5.);
      float dens = smoothstep(1.0-uCover, 1.0-uCover+0.4, n*0.72+n2*0.28+uCover*0.24);
      float shade = fbm(uv + uSun.xz*0.09);
      vec3 cc = mix(uCloudLit, uCloudDark, clamp(dens*0.65 + (n-shade)*1.6, 0., 1.));
      cc += uSunCol*pow(sd,12.)*0.6*(1.-dens)*uSunI;
      col = mix(col, cc, dens*smoothstep(0.004, 0.17, d.y));
    }
    col += vec3(0.7,0.76,1.0)*uFlash*(0.5+0.5*y);
    gl_FragColor = vec4(col,1.0);
    #include <tonemapping_fragment>
    #include <encodings_fragment>
  }`;
  const RAIN_VS = `
  attribute vec3 seed; attribute float tail; uniform float uTime,uInt; uniform vec3 uCam; uniform vec2 uWind; varying float vA;
  void main(){ vec3 box = vec3(46.,32.,46.); float sp = 21. + seed.y*9.;
    vec3 p = seed*box; p.y -= uTime*sp; p.xz += uWind*uTime; p = mod(p - uCam, box) - box*0.5; vec3 w = uCam + p;
    vec3 dir = normalize(vec3(uWind.x, -sp, uWind.y)); w -= dir * tail * (0.45+seed.z*0.5);
    vA = (1.-tail*0.8) * step(fract(seed.x*13.37+seed.z*7.1), uInt);
    gl_Position = projectionMatrix * viewMatrix * vec4(w,1.); }`;
  const RAIN_FS = 'varying float vA; uniform vec3 uCol; void main(){ if(vA<0.01) discard; gl_FragColor = vec4(uCol, 0.34*vA); }';

  E.init = function (scene, renderer) {
    E.scene = scene; E.renderer = renderer;
    const U = E.U = { uSun: { value: sunDir }, uMoon: { value: moonDir }, uZenith: { value: cz }, uHorizon: { value: ch }, uSunCol: { value: cs }, uCloudLit: { value: cl }, uCloudDark: { value: cd }, uTime: { value: 0 }, uCover: { value: 0.2 }, uNight: { value: 0 }, uFlash: { value: 0 }, uSunI: { value: 1 } };
    const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false });
    const dome = E.dome = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), mat); dome.renderOrder = -100; dome.frustumCulled = false; scene.add(dome);
    E.envScene = new THREE.Scene(); E.envScene.add(new THREE.Mesh(new THREE.SphereGeometry(40, 24, 12), mat));
    E.pmrem = new THREE.PMREMGenerator(renderer); E.envT = 99;
    E.sun = new THREE.DirectionalLight(0xffffff, 2); E.sun.castShadow = true; const sh = E.sun.shadow; sh.mapSize.set(2048, 2048); sh.camera.near = 20; sh.camera.far = 520; sh.bias = -0.0004; sh.normalBias = 0.06;
    E.setShadowRange(100); scene.add(E.sun); scene.add(E.sun.target);
    E.hemi = new THREE.HemisphereLight(0xffffff, 0x554433, 0.8); scene.add(E.hemi);
    scene.fog = new THREE.FogExp2(0xaabbcc, 0.001);
    // rain
    const N = 9000, seed = new Float32Array(N * 6), tail = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) { const a = Math.random(), b = Math.random(), c = Math.random(); seed.set([a, b, c, a, b, c], i * 6); tail[i * 2 + 1] = 1; }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3)); rg.setAttribute('seed', new THREE.BufferAttribute(seed, 3)); rg.setAttribute('tail', new THREE.BufferAttribute(tail, 1));
    E.rainU = { uTime: { value: 0 }, uInt: { value: 0 }, uCam: { value: new V3() }, uWind: { value: new THREE.Vector2() }, uCol: { value: new THREE.Color(0.75, 0.8, 0.9) } };
    E.rainMesh = new THREE.LineSegments(rg, new THREE.ShaderMaterial({ uniforms: E.rainU, vertexShader: RAIN_VS, fragmentShader: RAIN_FS, transparent: true, depthWrite: false, fog: false }));
    E.rainMesh.frustumCulled = false; E.rainMesh.renderOrder = 50; E.rainMesh.visible = false; scene.add(E.rainMesh);
    E.nextChange = 2 + Math.random() * 3; E.flashT = 5;
    E.setWeather(E.weather, true);
  };
  E.setShadowRange = function (s) { const c = E.sun.shadow.camera; c.left = -s; c.right = s; c.top = s; c.bottom = -s; c.updateProjectionMatrix(); E.shadowRange = s; };
  E.setWeather = function (name, instant) { if (!E.WEATHER[name]) return; E.weather = name; const t = E.WEATHER[name]; if (instant) { Object.assign(cur, { cover: t.cover, oc: t.oc, rain: t.rain, fog: t.fog, wind: t.wind }); if (t.rain > 0.4) E.wet = 1; E.envT = 99; } };
  E.clock = function () { const h = Math.floor(E.time), m = Math.floor((E.time - h) * 60); return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; };
  E.dayName = () => DAYS[E.day % 7];
  E.label = () => E.WEATHER[E.weather].label;

  E.update = function (dt, camera, focus, indoors) {
    // clock
    const dh = dt * E.timeScale * (E.warp || 1); E.time += dh; if (E.time >= 24) { E.time -= 24; E.day++; }
    if (E.auto) { E.nextChange -= dh; if (E.nextChange <= 0) { E.nextChange = 2.5 + Math.random() * 4; let n = G.pick(NEXT[E.weather]); if ((E.time > 3 && E.time < 7.5) && Math.random() < 0.3) n = 'fog'; E.setWeather(n); } }
    const tg = E.WEATHER[E.weather], k = 1 - Math.exp(-dt / 14 * (E.warp || 1));
    cur.cover += (tg.cover - cur.cover) * k; cur.oc += (tg.oc - cur.oc) * k; cur.rain += (tg.rain - cur.rain) * k; cur.fog += (tg.fog - cur.fog) * k; cur.wind += (tg.wind - cur.wind) * k;
    E.rain = cur.rain < 0.02 ? 0 : cur.rain; E.wind = cur.wind;
    if (E.rain > 0.05) E.wet = Math.min(1, E.wet + dt * E.rain / 14); else E.wet = Math.max(0, E.wet - dt / 110);
    // sun & moon
    const a = (E.time - 6) / 12 * Math.PI; sunDir.set(Math.cos(a), Math.sin(a) * 0.93, Math.sin(a) * 0.3 + 0.12).normalize();
    const am = a + Math.PI * 0.92; moonDir.set(Math.cos(am) * 0.9, Math.sin(am) * 0.8, -0.35).normalize();
    const e = sunDir.y, day = G.smooth(-0.12, 0.2, e), tw = G.clamp(1 - Math.abs(e) / 0.3, 0, 1) * (e > -0.2 ? 1 : 0), oc = cur.oc;
    E.night = 1 - G.smooth(-0.08, 0.1, e); E.dayF = day;
    cz.setRGB(G.lerp(0.004, 0.09, day), G.lerp(0.007, 0.24, day), G.lerp(0.022, 0.6, day));
    ch.setRGB(G.lerp(0.016, 0.56, day) + tw * 0.34, G.lerp(0.022, 0.66, day) + tw * 0.1, G.lerp(0.045, 0.76, day) - tw * 0.1 * day);
    const gr = 0.05 + 0.5 * day; tmpC.setRGB(gr * 0.82, gr * 0.86, gr * 0.93); cz.lerp(tmpC, oc * 0.92); tmpC.setRGB(gr * 1.05, gr * 1.08, gr * 1.12); ch.lerp(tmpC, oc * 0.9);
    tmpC.setRGB(0.62 * day + 0.02, 0.6 * day + 0.02, 0.55 * day + 0.03); ch.lerp(tmpC, G.clamp(cur.fog * 60, 0, 0.75));
    cs.setRGB(1, G.lerp(0.42, 0.95, G.smooth(0, 0.35, e)), G.lerp(0.16, 0.86, G.smooth(0, 0.4, e)));
    const sunI = G.smooth(-0.05, 0.1, e) * (1 - 0.92 * oc);
    cl.setRGB(G.lerp(0.05, 1.0, day) + tw * 0.4, G.lerp(0.06, 0.98, day) + tw * 0.1, G.lerp(0.1, 0.96, day)).multiplyScalar(1 - 0.5 * oc);
    cd.copy(cl).multiply(tmpC.setRGB(0.42, 0.46, 0.55)).multiplyScalar(1 - 0.45 * oc);
    // lightning
    if (E.weather === 'storm' && cur.rain > 0.8 && !indoors) { E.flashT -= dt; if (E.flashT <= 0) { E.flashT = 3 + Math.random() * 11; E.flash = 1; E.flashSeq = 0.35; if (G.audio) G.audio.thunder(0.4 + Math.random() * 2.5); } }
    if (E.flash > 0) { E.flash *= Math.exp(-dt * 9); if (E.flashSeq > 0) { E.flashSeq -= dt; if (E.flashSeq <= 0 && Math.random() < 0.7) E.flash = 0.8; } if (E.flash < 0.01) E.flash = 0; }
    const U = E.U; U.uTime.value += dt * (0.6 + cur.wind); U.uCover.value = cur.cover; U.uNight.value = E.night; U.uFlash.value = E.flash; U.uSunI.value = sunI;
    E.dome.position.copy(camera.position);
    // lights
    const useSun = e > -0.03, L = E.sun, dir = useSun ? sunDir : moonDir;
    if (useSun) { L.color.copy(cs); L.intensity = 1.75 * sunI + 0.02; } else { L.color.setRGB(0.5, 0.62, 1.0); L.intensity = 0.38 * (1 - oc * 0.75) * G.smooth(0, 0.2, moonDir.y) + 0.02; }
    const S = E.shadowRange, tex = (S * 2) / L.shadow.mapSize.x * 4; // snap to reduce shimmer
    const fx = Math.round(focus.x / tex) * tex, fz = Math.round(focus.z / tex) * tex;
    L.target.position.set(fx, focus.y, fz); L.position.set(fx + dir.x * 260, focus.y + Math.max(0.12, dir.y) * 260, fz + dir.z * 260);
    const hI = 0.2 + 0.42 * day + oc * 0.16 * day + E.flash * 2.5;
    E.hemi.intensity = hI; E.hemi.color.setRGB(G.lerp(0.32, 0.72, day), G.lerp(0.4, 0.82, day), G.lerp(0.7, 1.0, day)); E.hemi.groundColor.setRGB(G.lerp(0.16, 0.42, day), G.lerp(0.15, 0.37, day), G.lerp(0.16, 0.3, day));
    // fog
    const f = E.scene.fog; f.color.copy(ch).lerp(cz, 0.18); E.fogBase = (G.quality === 0 ? 0.0019 : 0.00115); f.density = E.fogBase + cur.fog + E.rain * 0.0009;
    E.horizon = ch;
    // rain
    E.rainMesh.visible = E.rain > 0 && !indoors;
    if (E.rainMesh.visible) { const R = E.rainU; R.uTime.value += dt; R.uInt.value = E.rain; R.uCam.value.copy(camera.position); R.uWind.value.set(E.windX * cur.wind * 2.2, E.windZ * cur.wind * 2.2); const b = 0.35 + 0.65 * day + E.flash; R.uCol.value.setRGB(0.75 * b, 0.8 * b, 0.9 * b); }
    // reflections
    E.envT += dt; if (E.envT > 7) { E.envT = 0; const rt = E.pmrem.fromScene(E.envScene, 0, 0.1, 100); if (E.envRT) E.envRT.dispose(); E.envRT = rt; E.scene.environment = rt.texture; }
    E.exposure = G.lerp(1.0, 1.55, E.night) * (1 + oc * 0.12 * day);
    E.bloomThreshold = G.lerp(1.9, 0.82, E.night); E.bloomStrength = G.lerp(0.22, 0.75, E.night) + E.rain * 0.1;
  };
})();
