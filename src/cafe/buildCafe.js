// Chilly Coffee v2 — bản chi tiết: vật liệu procedural có normal map, đồ đạc bo tròn, cây lá thật, gộp khối theo vật liệu.
// buildCafe(THREE) -> { root, lights, seats, ceiling }. Đơn vị mét, Y hướng lên.
function buildCafe(THREE) {
  const root = new THREE.Group(); root.name = 'ChillyCoffee';
  const lights = new THREE.Group(); lights.name = 'Lights';
  const seats = [];
  const H = 3.3;
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  // ---------------- noise ----------------
  const fract = x => x - Math.floor(x);
  const hash = (i, j) => fract(Math.sin(i * 127.1 + j * 311.7) * 43758.5453);
  const sm = t => t * t * (3 - 2 * t);
  function noise(x, y) {
    const i = Math.floor(x), j = Math.floor(y), fx = sm(x - i), fy = sm(y - j);
    const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  function fbm(x, y, o) { let v = 0, a = 0.5, f = 1; for (let k = 0; k < (o || 4); k++) { v += a * noise(x * f, y * f); f *= 2.03; a *= 0.5; } return v; }
  const mix = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

  // makeTex: fn(u,v) -> [r,g,b,height]. Trả về { map, normal }.
  function makeTex(size, fn, strength, opts) {
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const g = cv.getContext('2d'); const img = g.createImageData(size, size);
    const hgt = new Float32Array(size * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const c = fn(x / size, y / size); const i = (y * size + x);
      img.data[i * 4] = clamp(c[0], 0, 255); img.data[i * 4 + 1] = clamp(c[1], 0, 255); img.data[i * 4 + 2] = clamp(c[2], 0, 255); img.data[i * 4 + 3] = 255;
      hgt[i] = c[3] || 0;
    }
    g.putImageData(img, 0, 0);
    if (opts && opts.draw) opts.draw(g, size);
    const map = new THREE.CanvasTexture(cv); map.encoding = THREE.sRGBEncoding;
    map.wrapS = map.wrapT = THREE.RepeatWrapping; map.userData.mimeType = 'image/jpeg';
    let normal = null;
    if (strength) {
      const nc = document.createElement('canvas'); nc.width = nc.height = size;
      const ng = nc.getContext('2d'); const nd = ng.createImageData(size, size);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const l = hgt[y * size + ((x - 1 + size) % size)], r = hgt[y * size + ((x + 1) % size)];
        const u = hgt[((y - 1 + size) % size) * size + x], d = hgt[((y + 1) % size) * size + x];
        let nx = (l - r) * strength, ny = (d - u) * strength, nz = 1; const len = Math.hypot(nx, ny, nz);
        const i = (y * size + x) * 4; nd.data[i] = (nx / len * 0.5 + 0.5) * 255; nd.data[i + 1] = (ny / len * 0.5 + 0.5) * 255; nd.data[i + 2] = (nz / len * 0.5 + 0.5) * 255; nd.data[i + 3] = 255;
      }
      ng.putImageData(nd, 0, 0);
      normal = new THREE.CanvasTexture(nc); normal.wrapS = normal.wrapT = THREE.RepeatWrapping; normal.userData.mimeType = 'image/jpeg';
    }
    return { map, normal };
  }
  const canvasTex = (w, h, draw, jpeg) => {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (jpeg) t.userData.mimeType = 'image/jpeg'; return t;
  };
  const PBR = (t, o) => new THREE.MeshStandardMaterial(Object.assign({ map: t.map, normalMap: t.normal || null, roughness: 0.9, metalness: 0 }, o || {}));

  // ---------------- vật liệu procedural ----------------
  const patina = (base, green, stainK) => (u, v) => {
    const n1 = fbm(u * 3, v * 3), n2 = fbm(u * 14 + 5, v * 14), gr = noise(u * 260, v * 260);
    const t = smooth(0.35, 0.7, n1);
    let r = mix(base[0], green[0], t), g = mix(base[1], green[1], t), b = mix(base[2], green[2], t);
    const st = smooth(0.58, 0.75, fbm(u * 5 + 9, v * 1.6)) * stainK; r *= 1 - st * 0.45; g *= 1 - st * 0.4; b *= 1 - st * 0.38;
    const drip = smooth(0.62, 0.82, fbm(u * 50, v * 2.2 + 3)) * 0.1; r *= 1 - drip; g *= 1 - drip; b *= 1 - drip;
    const lt = smooth(0.62, 0.8, n2) * 0.15; r += lt * 60; g += lt * 58; b += lt * 50;
    const k = (gr - 0.5) * 22; return [r + k, g + k, b + k, gr * 0.6 + n2 * 0.8];
  };
  const T = {};
  T.wall = makeTex(1024, patina([150, 150, 138], [122, 138, 124], 0.6), 2.2);
  T.back = makeTex(512, patina([118, 140, 126], [86, 116, 102], 0.8), 2.2);
  T.plaster = makeTex(512, (u, v) => { const n = fbm(u * 6, v * 6), g = noise(u * 220, v * 220); const k = (n - 0.5) * 20 + (g - 0.5) * 10; const st = smooth(0.65, 0.8, fbm(u * 4 + 2, v * 1.5)) * 30; return [228 + k - st, 224 + k - st, 212 + k - st * 1.1, g * 0.5 + n]; }, 1.5);
  T.floor = makeTex(1024, (u, v) => {
    const n = fbm(u * 4, v * 4), g = noise(u * 300, v * 300), cr = Math.abs(fbm(u * 3 + 7, v * 3 + 1, 5) - 0.5);
    let c = 128 + (n - 0.5) * 22 + (g - 0.5) * 8; const crack = cr < 0.0025 ? 1 : 0; c -= crack * 28;
    const patch = smooth(0.6, 0.72, fbm(u * 2 + 4, v * 2)) * 14; c -= patch;
    return [c, c, c * 0.97, g * 0.3 - crack * 1.5];
  }, 3);
  T.ceil = makeTex(512, (u, v) => {
    const w = Math.sin(v * Math.PI * 2 * 48); const n = fbm(u * 6, v * 6); const rust = smooth(0.66, 0.78, fbm(u * 8 + 3, v * 8)) ;
    const c = 150 + w * 18 + (n - 0.5) * 20; return [c + rust * 30, c - rust * 5, c - rust * 25 + 6, w];
  }, 7);
  T.planks = makeTex(512, (u, v) => {
    const b = Math.floor(u * 8), f = fract(u * 8), tone = hash(b, 3) * 0.35;
    const grain = fbm(u * 70 + b * 13, v * 4, 3), gap = f < 0.03 || f > 0.97 ? 1 : 0;
    let r = 70 - tone * 30 + (grain - 0.5) * 30, g = 50 - tone * 22 + (grain - 0.5) * 22, bl = 36 - tone * 16 + (grain - 0.5) * 16;
    if (gap) { r *= 0.35; g *= 0.35; bl *= 0.35; }
    return [r, g, bl, grain * 0.6 - gap * 1.2];
  }, 2.5);
  T.oldwood = makeTex(512, (u, v) => {
    const b = Math.floor(v * 4), f = fract(v * 4), tone = hash(b, 7) * 0.4;
    const grain = fbm(u * 3 + b * 5, v * 90, 4), knot = smooth(0.82, 0.9, fbm(u * 6 + b, v * 6)) * 0.5;
    const gap = f < 0.025 || f > 0.975 ? 1 : 0, worn = smooth(0.55, 0.75, fbm(u * 5, v * 5 + 2)) * 0.25;
    let r = 112 - tone * 40 + (grain - 0.5) * 50 - knot * 60 + worn * 50, g = 76 - tone * 28 + (grain - 0.5) * 34 - knot * 45 + worn * 34, bl = 52 - tone * 20 + (grain - 0.5) * 22 - knot * 30 + worn * 20;
    if (gap) { r *= 0.3; g *= 0.3; bl *= 0.3; }
    return [r, g, bl, grain * 0.8 - gap * 1.5 - knot];
  }, 3);
  T.slat = makeTex(256, (u, v) => { const gr = fbm(u * 2, v * 60, 3); return [168 + (gr - 0.5) * 50, 92 + (gr - 0.5) * 30, 48 + (gr - 0.5) * 18, gr]; }, 1.2);
  T.granite = makeTex(512, (u, v) => {
    const h = hash(Math.floor(u * 512), Math.floor(v * 512)), h2 = hash(Math.floor(u * 180) + 3, Math.floor(v * 180));
    let c = 26 + (noise(u * 40, v * 40) - 0.5) * 14; if (h > 0.982) c = 190 + h * 40; else if (h2 > 0.95) c = 95;
    return [c, c, c * 0.98, h > 0.965 ? 0.4 : 0];
  }, 1.2);
  T.leather = makeTex(512, (u, v) => {
    const n = fbm(u * 6, v * 6), cr = fbm(u * 40, v * 40, 3), w = smooth(0.6, 0.8, fbm(u * 3 + 1, v * 3)) * 0.3;
    return [176 + (n - 0.5) * 40 - cr * 26 + w * 40, 108 + (n - 0.5) * 26 - cr * 20 + w * 26, 56 + (n - 0.5) * 16 - cr * 12 + w * 14, cr];
  }, 2);
  T.alu = makeTex(512, (u, v) => {
    const fu = fract(u * 4), fv = fract(v * 2), seam = fu < 0.006 || fv < 0.008 ? 1 : 0;
    const rv = (Math.hypot((fu * 4 % 0.25) - 0.125, (fv < 0.04 ? fv - 0.02 : 1)) < 0.012) || (Math.hypot(fu - 0.02, (fv * 6 % 1) - 0.5) < 0.04 / 4) ? 1 : 0;
    const br = noise(u * 600, v * 6) - 0.5, d = fbm(u * 5, v * 5);
    const c = 182 + br * 18 + (d - 0.5) * 30 - seam * 70;
    return [c, c + 2, c + 5, -seam * 1.2 + rv * 1.0 + br * 0.1];
  }, 3);
  T.tiles = makeTex(512, (u, v) => {
    const iu = Math.floor(u * 6), iv = Math.floor(v * 6), fu = fract(u * 6), fv = fract(v * 6), grout = fu < 0.03 || fv < 0.03 ? 1 : 0;
    const t = hash(iu, iv) * 18 + (noise(u * 80, v * 80) - 0.5) * 12; const c = grout ? 105 : 160 + t;
    return [c, c * 0.98, c * 0.94, grout ? -1 : noise(u * 80, v * 80) * 0.2];
  }, 2.5);
  T.asphalt = makeTex(512, (u, v) => { const n = noise(u * 220, v * 220), f = fbm(u * 5, v * 5); const c = 66 + (n - 0.5) * 12 + (f - 0.5) * 10; return [c, c, c * 1.02, n * 0.4]; }, 1.0);

  const canv = {};
  canv.lattice = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#262626'; g.fillRect(0, 0, w, h); g.strokeStyle = '#0a0a0a'; g.lineWidth = 6; for (let i = -h; i < w + h; i += 24) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.moveTo(i + h, 0); g.lineTo(i, h); g.stroke(); } }, true);
  canv.crate = canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#efeee9'; g.fillRect(0, 0, w, h); g.fillStyle = '#8f8d86'; for (let x = 6; x < w; x += 16) for (let y = 6; y < h; y += 16) g.fillRect(x, y, 10, 10); }, true);
  canv.sign = canvasTex(512, 144, (g, w, h) => { g.translate(w, 0); g.scale(-1, 1); g.fillStyle = '#111'; g.fillRect(0, 0, w, h); g.fillStyle = '#f4efe4'; g.textAlign = 'center'; g.font = '700 64px sans-serif'; g.fillText('Chilly', w / 2, 74); g.font = '28px sans-serif'; g.fillText('coffee', w / 2, 116); g.font = '30px sans-serif'; g.fillText('★', w / 2 + 112, 44); });
  canv.lightbox = canvasTex(128, 288, (g, w, h) => { g.translate(w, 0); g.scale(-1, 1); g.fillStyle = '#f6dfa8'; g.fillRect(0, 0, w, h); g.fillStyle = '#4a3214'; g.textAlign = 'center'; g.font = '700 18px sans-serif'; ['MỆT?', 'COFFEE', 'VUI?', 'COFFEE', 'DEADLINE?', 'COFFEE'].forEach((s, i) => g.fillText(s, w / 2, 40 + i * 42)); });
  canv.clock = canvasTex(128, 128, g => { g.fillStyle = '#f2efe6'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#2b2b2b'; g.lineWidth = 3; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.beginPath(); g.moveTo(64 + Math.cos(a) * 46, 64 + Math.sin(a) * 46); g.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56); g.stroke(); } g.lineWidth = 4; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 30); g.moveTo(64, 64); g.lineTo(88, 72); g.stroke(); });
  canv.polaroid = canvasTex(256, 384, (g, w, h) => { g.fillStyle = '#1f4fb5'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9b48a'; g.fillRect(14, 10, w - 28, 80); for (let r = 0; r < 9; r++) for (let c = 0; c < 6; c++) { g.fillStyle = '#f3f0e8'; g.fillRect(14 + c * 39, 104 + r * 30, 34, 26); g.fillStyle = ['#7a5a3a', '#3e5a6e', '#8a4a3a', '#5a6a3a'][(r + c) % 4]; g.fillRect(17 + c * 39, 107 + r * 30, 28, 17); } }, true);
  canv.sketch = canvasTex(128, 160, (g, w, h) => { g.fillStyle = '#efece4'; g.fillRect(0, 0, w, h); g.strokeStyle = '#6b6b6b'; g.lineWidth = 2; g.beginPath(); g.arc(64, 70, 32, 0, 7); g.stroke(); g.beginPath(); g.moveTo(30, 150); g.quadraticCurveTo(64, 100, 98, 150); g.stroke(); g.globalAlpha = 0.3; for (let i = 0; i < 30; i++) { g.beginPath(); g.moveTo(rnd() * w, rnd() * h); g.lineTo(rnd() * w, rnd() * h); g.stroke(); } }, true);
  canv.oldphoto = canvasTex(256, 160, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#b8ab90'); gr.addColorStop(1, '#6e624e'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#3a3226'; for (let r = 0; r < 4; r++) for (let c = 0; c < 14; c++) { g.beginPath(); g.arc(14 + c * 17 + (r % 2) * 8, 60 + r * 22, 6, 0, 7); g.fill(); g.fillRect(9 + c * 17 + (r % 2) * 8, 66 + r * 22, 10, 14); } }, true);
  canv.flag = canvasTex(300, 200, (g, w, h) => { g.fillStyle = '#d42b20'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd400'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 26 : 64; g.lineTo(w / 2 + Math.cos(a) * r, h / 2 + 6 + Math.sin(a) * r); } g.fill(); }, true);
  canv.kraft = canvasTex(128, 200, (g, w, h) => { g.fillStyle = '#c79b6a'; g.fillRect(0, 0, w, h); g.fillStyle = '#3b2a1a'; for (let i = 0; i < 8; i++) g.fillRect(16, 30 + i * 20, 50 + rnd() * 40, 3); }, true);
  canv.record = canvasTex(128, 128, g => { g.fillStyle = '#f1efe9'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#151515'; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.fill(); g.strokeStyle = '#2a2a2a'; for (let r = 22; r < 50; r += 4) { g.beginPath(); g.arc(64, 64, r, 0, 7); g.stroke(); } g.fillStyle = '#c0392b'; g.beginPath(); g.arc(64, 64, 16, 0, 7); g.fill(); });
  canv.bld = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#d9d2c4'; g.fillRect(0, 0, w, h); for (let c = 0; c < 8; c++) for (let r = 0; r < 2; r++) { g.fillStyle = '#7d8a91'; g.fillRect(20 + c * 62, 30 + r * 110, 40, 60); g.fillStyle = '#b9b2a4'; g.fillRect(16 + c * 62, 92 + r * 110, 48, 6); } g.fillStyle = '#a49c8e'; g.fillRect(0, h - 40, w, 40); }, true);
  canv.screen = canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#e9eef5'; g.fillRect(0, 0, w, h); g.fillStyle = '#3c6ea8'; g.fillRect(0, 0, w, 18); g.fillStyle = '#9aa7b6'; for (let i = 0; i < 9; i++) g.fillRect(16, 32 + i * 13, 80 + rnd() * 140, 5); }, true);
  canv.books = canvasTex(512, 64, (g, w, h) => { let x = 0; while (x < w) { const bw = 8 + rnd() * 14; g.fillStyle = ['#8a3b2b', '#2d4b6a', '#c8a24a', '#3f5d3a', '#e8e2d0', '#6a4a7a', '#b5562f'][Math.floor(rnd() * 7)]; const bh = 40 + rnd() * 24; g.fillRect(x, h - bh, bw - 1, bh); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 2, h - bh + 6, bw - 5, 2); x += bw; } }, false);

  // ---------------- material cache ----------------
  const cache = {};
  const M = (c, o) => { const k = c + JSON.stringify(o || {}); if (!cache[k]) cache[k] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8, metalness: 0 }, o || {})); return cache[k]; };
  const mWall = PBR(T.wall), mBack = PBR(T.back), mWhite = PBR(T.plaster), mFloor = PBR(T.floor, { roughness: 0.42 });
  const mCeil = PBR(T.ceil, { metalness: 0.45, roughness: 0.5, side: THREE.DoubleSide });
  const mPlanks = PBR(T.planks, { roughness: 0.75 }), mOld = PBR(T.oldwood, { roughness: 0.7 }), mSlat = PBR(T.slat, { roughness: 0.55 });
  const mGranite = PBR(T.granite, { roughness: 0.35 }), mLeather = PBR(T.leather, { roughness: 0.5 });
  const mAlu = PBR(T.alu, { metalness: 0.75, roughness: 0.38 }), mTiles = PBR(T.tiles, { roughness: 0.8 }), mAsphalt = PBR(T.asphalt, { roughness: 0.95 });
  const mGlass = new THREE.MeshStandardMaterial({ color: 0xd6ecf2, transparent: true, opacity: 0.14, roughness: 0.05, metalness: 0.1, depthWrite: false });
  const BLACK = M(0x1b1b1b, { roughness: 0.6 }), DARK = M(0x2b2826), STEEL = M(0x8c9196, { metalness: 0.8, roughness: 0.32 });
  const CHROME = M(0xd7dbde, { metalness: 0.95, roughness: 0.12 }), WOOD = M(0x5a3a26, { roughness: 0.7 }), CREAM = M(0xf2ede1, { roughness: 0.5 });
  const TEAL = M(0x2e7b86, { roughness: 0.45, metalness: 0.3 }), GREEN = M(0x2d4a3b, { roughness: 0.6 }), PIPE = M(0xf0f0ec, { roughness: 0.4 });
  const WARM = M(0xfff0c8, { emissive: 0xffc26a, emissiveIntensity: 2.0 });
  const LEAF = M(0x3c7a34, { roughness: 0.55, side: THREE.DoubleSide }), LEAF2 = M(0x5e9c45, { roughness: 0.55, side: THREE.DoubleSide }), LEAF3 = M(0x2f5f2c, { roughness: 0.6, side: THREE.DoubleSide });
  const GLASSJAR = M(0xdcefe9, { transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.1 });

  // ---------------- geometry helpers ----------------
  const add = (m, p, name) => { if (name) m.name = name; (p || root).add(m); return m; };
  const grp = (name, p) => { const g = new THREE.Group(); g.name = name; (p || root).add(g); return g; };
  const mesh = (geo, m, x, y, z, p, name) => { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); return add(k, p, name); };
  const box = (w, h, d, m, x, y, z, p, name) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z, p, name);
  const cyl = (rt, rb, h, m, x, y, z, p, seg) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 16), m, x, y, z, p);
  const sph = (r, m, x, y, z, p, ws, hs) => mesh(new THREE.SphereGeometry(r, ws || 14, hs || 10), m, x, y, z, p);
  const plane = (w, h, m, x, y, z, ry, p, name) => { const k = mesh(new THREE.PlaneGeometry(w, h), m, x, y, z, p, name); k.rotation.y = ry || 0; return k; };
  const rboxCache = {};
  const weldLater = g => weld(g);
  function rboxGeo(w, h, d, r) {
    const key = [w, h, d, r].map(v => v.toFixed(3)).join('_'); if (rboxCache[key]) return rboxCache[key];
    r = Math.min(r, w / 2 - 0.002, h / 2 - 0.002, d / 2 - 0.002);
    const s = new THREE.Shape(), a = (w - 2 * r) / 2, b = (d - 2 * r) / 2, e = 0.0005;
    s.moveTo(-a + e, -b); s.lineTo(a - e, -b); s.absarc(a - e, -b + e, e, -Math.PI / 2, 0); s.lineTo(a, b - e); s.absarc(a - e, b - e, e, 0, Math.PI / 2);
    s.lineTo(-a + e, b); s.absarc(-a + e, b - e, e, Math.PI / 2, Math.PI); s.lineTo(-a, -b + e); s.absarc(-a + e, -b + e, e, Math.PI, Math.PI * 1.5);
    const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 2, curveSegments: 2 });
    g.rotateX(-Math.PI / 2); g.translate(0, -(h - 2 * r) / 2, 0);
    g.computeVertexNormals(); const wg = weldLater(g); rboxCache[key] = wg; return wg;
  }
  const rbox = (w, h, d, r, m, x, y, z, p, name) => mesh(rboxGeo(w, h, d, r), m, x, y, z, p, name);
  function tube(p1, p2, r, m, p, seg) {
    const a = new THREE.Vector3(...p1), b = new THREE.Vector3(...p2), L = a.distanceTo(b);
    const k = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, seg || 8), m);
    k.position.copy(a).add(b).multiplyScalar(0.5); k.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return add(k, p);
  }
  const leafGeoCache = {};
  function leafGeo(w, l, kind) {
    const key = w + '_' + l + '_' + kind; if (leafGeoCache[key]) return leafGeoCache[key];
    const s = new THREE.Shape(); s.moveTo(0, 0);
    if (kind === 'heart') { s.bezierCurveTo(w * 0.9, l * 0.05, w * 0.7, l * 0.75, 0, l); s.bezierCurveTo(-w * 0.7, l * 0.75, -w * 0.9, l * 0.05, 0, 0); }
    else if (kind === 'long') { s.bezierCurveTo(w * 0.6, l * 0.2, w * 0.5, l * 0.85, 0, l); s.bezierCurveTo(-w * 0.5, l * 0.85, -w * 0.6, l * 0.2, 0, 0); }
    else { s.bezierCurveTo(w, l * 0.25, w * 0.6, l * 0.8, 0, l); s.bezierCurveTo(-w * 0.6, l * 0.8, -w, l * 0.25, 0, 0); }
    const g = new THREE.ShapeGeometry(s, 5);
    const pos = g.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setZ(i, -Math.abs(x) * 0.35 + Math.sin(y / l * Math.PI) * l * 0.08); }
    g.computeVertexNormals(); leafGeoCache[key] = g; return g;
  }
  function leaf(x, y, z, w, l, yaw, pitch, m, p, kind) {
    const k = new THREE.Mesh(leafGeo(w, l, kind), m); k.position.set(x, y, z);
    k.rotation.order = 'YXZ'; k.rotation.y = yaw; k.rotation.x = -pitch; return add(k, p);
  }
  const latheCache = {};
  function domeGeo(r, depth) {
    const key = r + '_' + depth; if (latheCache[key]) return latheCache[key];
    const pts = [[0.025, 0], [0.04, -0.01], [0.05, -0.04], [r * 0.45, -depth * 0.55], [r * 0.85, -depth * 0.9], [r, -depth]].map(([a, b]) => new THREE.Vector2(a, b));
    const g = new THREE.LatheGeometry(pts, 24); latheCache[key] = g; return g;
  }
  const LBL0 = { Ban_01: 'Bàn 1 – sát kính trước', Ban_02: 'Bàn 2 – sát kính trước', Ban_03: 'Bàn 3 – sát kính trước', Ban_04: 'Bàn 4 – sát kính trước', Ban_05: 'Bàn 5 – kính bên', Ban_06: 'Bàn 6 – kính bên', Ban_07: 'Bàn 7 – bàn gỗ có mèo', Ban_08: 'Bàn 8 – bàn gỗ giữa', Ban_09: 'Bàn 9 – sofa da', Ban_10: 'Bàn 10 – bàn lưới đen', Ban_11: 'Bàn 11 – phòng sau' };
  function seatAt(name, cx, cz, tx, ty, tz, label) { seats.push({ name, label: label || LBL0[name] || name, cam: [cx, 1.18, cz], look: [tx, ty, tz] }); }

  // ---------------- sàn, đường, vỉa hè ----------------
  const fl = plane(7, 6, mFloor, 0, 0, 0, 0, root, 'San'); fl.rotation.x = -Math.PI / 2;
  const fl2 = plane(2.9, 3, mFloor, -2.05, 0, -4.5, 0, root, 'San_Phong_Sau'); fl2.rotation.x = -Math.PI / 2;
  const ground = plane(14, 24, mAsphalt, 1.5, -0.01, -4.5, 0, root, 'Mat_Duong'); ground.rotation.x = -Math.PI / 2;
  box(7.6, 0.08, 1.5, mTiles, 0, 0.03, 3.95, root, 'Via_He_Truoc');
  box(1.7, 0.08, 18.2, mTiles, 4.55, 0.03, -4.4, root, 'Via_He_Ben');
  plane(14, 6, M(0xffffff, { map: canv.bld }), 1.5, 3, 7.2, Math.PI, root, 'Nha_Doi_Dien_Truoc');
  plane(24, 6, M(0xffffff, { map: canv.bld }), 7.8, 3, -4.5, -Math.PI / 2, root, 'Nha_Doi_Dien_Ben');

  // ---------------- tường ----------------
  const walls = grp('Tuong');
  box(0.9, H, 0.2, mWall, -3.05, H / 2, -3.1, walls);
  box(4.5, H, 0.2, mWall, 1.25, H / 2, -3.1, walls);
  box(1.6, H - 2.3, 0.2, mWall, -1.8, 2.3 + (H - 2.3) / 2, -3.1, walls);
  box(0.2, H, 6.2, mWhite, -3.6, H / 2, 0, walls);
  box(1.9, H, 0.2, mWall, -2.55, H / 2, 3.1, walls);
  box(2.8, 0.85, 0.2, mWall, -0.2, 0.425, 3.1, walls);
  box(2.8, H - 2.75, 0.2, mWall, -0.2, 2.75 + (H - 2.75) / 2, 3.1, walls);
  box(2.4, H, 0.2, mWall, 2.4, H / 2, 3.1, walls);
  box(0.2, 0.75, 1.9, mWall, 3.6, 0.375, 1.85, walls);
  box(0.2, H - 2.6, 1.9, mWall, 3.6, 2.6 + (H - 2.6) / 2, 1.85, walls);
  box(0.2, H, 0.4, mWall, 3.6, H / 2, 3.0, walls);
  box(0.2, H, 0.8, mWall, 3.6, H / 2, 0.5, walls);
  box(0.2, H - 2.4, 1.2, mWall, 3.6, 2.4 + (H - 2.4) / 2, -0.5, walls);
  box(0.2, H, 2.1, mWall, 3.6, H / 2, -2.15, walls);
  box(0.2, H, 3.2, mBack, -3.6, H / 2, -4.5, walls);
  // chân tường tối
  box(6.9, 0.1, 0.02, DARK, 0, 0.05, -2.99, walls); box(0.02, 0.1, 6.0, DARK, -3.49, 0.05, 0, walls);

  const glass = grp('Kinh');
  plane(2.8, 1.9, mGlass, -0.2, 1.8, 3.12, 0, glass, 'Kinh_Truoc');
  plane(1.9, 1.85, mGlass, 3.62, 1.675, 1.85, Math.PI / 2, glass, 'Kinh_Ben');
  [-1.6, -0.2, 1.2].forEach(x => box(0.06, 1.9, 0.08, BLACK, x, 1.8, 3.08, glass));
  box(2.86, 0.06, 0.08, BLACK, -0.2, 2.75, 3.08, glass); box(2.86, 0.06, 0.1, BLACK, -0.2, 0.85, 3.08, glass);
  [0.9, 1.85, 2.8].forEach(z => box(0.08, 1.85, 0.06, BLACK, 3.58, 1.675, z, glass));
  box(0.08, 0.06, 1.9, BLACK, 3.58, 2.6, 1.85, glass);
  [-1.1, 0.1].forEach(z => box(0.08, 2.4, 0.06, BLACK, 3.58, 1.2, z, glass));
  box(0.08, 0.06, 1.2, BLACK, 3.58, 2.4, -0.5, glass);
  // cửa chính: 2 cánh kính mở hẳn ra ngoài, áp sát tường
  [[-1.06, 1], [0.06, -1]].forEach(([hz, sgn], i) => {
    const leaf = grp('Cua_Chinh_Canh_' + (i + 1), glass); leaf.position.set(3.74, 0, hz); leaf.rotation.y = sgn * Math.PI / 2 * 0.97;
    const L = 0.58, dz = sgn * L / 2;
    box(0.035, 2.34, 0.035, BLACK, 0, 1.17, sgn * 0.0175, leaf); box(0.035, 2.34, 0.035, BLACK, 0, 1.17, sgn * (L - 0.0175), leaf);
    box(0.035, 0.05, L, BLACK, 0, 0.025, dz, leaf); box(0.035, 0.05, L, BLACK, 0, 2.315, dz, leaf); box(0.035, 0.04, L, BLACK, 0, 1.0, dz, leaf);
    const pane = plane(L - 0.04, 2.24, mGlass, 0, 1.17, dz, Math.PI / 2, leaf); pane.name = 'Kinh_Cua_Chinh';
    tube([0.03, 0.85, sgn * (L - 0.08)], [0.03, 1.35, sgn * (L - 0.08)], 0.012, STEEL, leaf); tube([-0.03, 0.85, sgn * (L - 0.08)], [-0.03, 1.35, sgn * (L - 0.08)], 0.012, STEEL, leaf);
  });
  const mat1 = box(0.9, 0.012, 1.1, M(0x3a2a20, { roughness: 1 }), 4.2, 0.08, -0.5, glass); mat1.name = 'Tham_Cua';

  // trần tôn + xà + ống điện
  const ceil = box(7.4, 0.04, 6.4, mCeil, 0, H + 0.02, 0, root, 'Tran');
  box(3.2, 0.05, 3.2, M(0x3a2c22), -2.05, 2.62, -4.5, root, 'Tran_Phong_Sau');
  const beams = grp('Xa_Tran');
  const pipes = grp('Ong_Dien');
  tube([-3.45, 3.16, 2.95], [3.45, 3.16, 2.95], 0.016, PIPE, pipes); tube([-3.45, 3.16, -2.95], [-3.45, 3.16, 2.95], 0.016, PIPE, pipes);
  tube([3.45, 3.1, -2.95], [3.45, 3.1, 2.95], 0.016, PIPE, pipes); tube([-1.0, 3.12, -2.95], [-1.0, 3.12, 2.9], 0.014, PIPE, pipes);
  [1.5, 1.55, 1.6, 1.65].forEach(x => tube([x, 2.15, 2.97], [x, 3.2, 2.97], 0.014, PIPE, pipes));
  [[-3.45, 2.2, 2.0], [3.45, 2.1, -1.0], [0.3, 3.16, 2.95]].forEach(([x, y, z]) => box(0.08, 0.08, 0.05, PIPE, x, y, z, pipes));
  tube([-3.45, 3.16, 2.0], [-3.45, 2.2, 2.0], 0.014, PIPE, pipes);

  // ---------------- mặt tiền ----------------
  const facade = grp('Mat_Tien');
  box(1.9, H, 0.04, mGranite, -2.55, H / 2, 3.22, facade);
  box(2.8, H - 2.75, 0.04, mGranite, -0.2, 2.75 + (H - 2.75) / 2, 3.22, facade);
  box(2.4, H, 0.04, mGranite, 2.4, H / 2, 3.22, facade);
  box(2.8, 0.85, 0.04, M(0xffffff, { map: canv.lattice }), -0.2, 0.425, 3.22, facade);
  box(0.04, 0.75, 1.9, M(0xffffff, { map: canv.lattice }), 3.72, 0.375, 1.85, facade);
  box(0.04, H - 2.6, 1.9, mGranite, 3.72, 2.6 + (H - 2.6) / 2, 1.85, facade);
  box(0.04, H, 0.4, mGranite, 3.72, H / 2, 3.0, facade);
  box(0.04, H, 0.8, mGranite, 3.72, H / 2, 0.5, facade);
  box(0.04, H - 2.4, 1.2, mGranite, 3.72, 2.4 + (H - 2.4) / 2, -0.5, facade);
  box(0.04, H, 2.1, mGranite, 3.72, H / 2, -2.15, facade);
  box(7.5, 0.12, 0.08, BLACK, 0, H + 0.06, 3.22, facade); box(0.08, 0.12, 6.5, BLACK, 3.72, H + 0.06, 0, facade);
  const sm1 = M(0xffffff, { map: canv.sign, emissive: 0xffffff, emissiveMap: canv.sign, emissiveIntensity: 0.4 });
  mesh(new THREE.BoxGeometry(1.9, 0.55, 0.1), [BLACK, BLACK, BLACK, BLACK, sm1, BLACK], 2.3, 2.98, 3.3, facade, 'Bien_Hieu');
  const lbm = M(0xffffff, { map: canv.lightbox, emissive: 0xffffff, emissiveMap: canv.lightbox, emissiveIntensity: 1.0 });
  mesh(new THREE.BoxGeometry(0.3, 0.72, 0.06), [BLACK, BLACK, BLACK, BLACK, lbm, BLACK], 1.55, 1.75, 3.27, facade, 'Hop_Den');
  mesh(new THREE.BoxGeometry(0.02, 0.5, 0.5), [M(0xffffff, { map: canv.record }), BLACK, BLACK, BLACK, BLACK, BLACK], 3.75, 1.95, 0.5, facade, 'Bang_Dia_Than');
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
    const z = -2.55 + c * 0.55, y = 1.15 + r * 0.5;
    box(0.05, 0.46, 0.5, BLACK, 3.75, y, z, facade); box(0.02, 0.38, 0.42, M(0xe9c27a, { emissive: 0xb07a2a, emissiveIntensity: 0.45 }), 3.775, y, z, facade);
  }
  // mái hiên vải + tua kim tuyến
  const awn = grp('Mai_Hien');
  const AWN = M(0x1c1c1c, { roughness: 0.9, side: THREE.DoubleSide });
  const a1 = box(1.35, 0.025, 3.8, AWN, 4.4, 2.82, -1.1, awn); a1.rotation.z = -0.32;
  const a2 = box(4.7, 0.025, 1.0, AWN, -1.15, 2.95, 3.68, awn); a2.rotation.x = 0.3;
  tube([5.03, 2.62, -3.0], [5.03, 2.62, 0.8], 0.015, BLACK, awn); tube([-3.5, 2.8, 4.16], [1.2, 2.8, 4.16], 0.015, BLACK, awn);
  const TINSEL = M(0xd12a2a, { roughness: 0.3, metalness: 0.5, side: THREE.DoubleSide });
  for (let z = -2.95; z < 0.75; z += 0.045) { const t = plane(0.035, 0.32 + rnd() * 0.22, TINSEL, 5.04, 2.45, z, Math.PI / 2 + (rnd() - 0.5) * 0.6, awn); t.position.y = 2.62 - t.geometry.parameters.height / 2; t.rotation.z = (rnd() - 0.5) * 0.25; }
  // đèn tường ngoài
  [[-2.4, 3.3, 0], [0.9, 3.3, 0], [3.82, -1.8, 1], [3.82, 1.9, 1]].forEach(([a, b, s]) => {
    const g = grp('Den_Tuong_Ngoai', facade);
    const px = s ? a + 0.25 : a, pz = s ? b : b + 0.25;
    tube([a, 2.6, b], [s ? a + 0.18 : a, 2.86, s ? b : b + 0.18], 0.012, BLACK, g); tube([s ? a + 0.18 : a, 2.86, s ? b : b + 0.18], [px, 2.8, pz], 0.012, BLACK, g);
    const d = new THREE.Mesh(domeGeo(0.14, 0.12), M(0x2a2a2a, { side: THREE.DoubleSide, metalness: 0.5, roughness: 0.4 })); d.position.set(px, 2.8, pz); g.add(d);
    sph(0.035, WARM, px, 2.7, pz, g);
    const pl = new THREE.PointLight(0xffb45a, 0.7, 3.5, 2); pl.position.set(px, 2.55, pz); lights.add(pl);
  });
  cyl(0.09, 0.09, 4.4, M(0x5aa6a8, { roughness: 0.5 }), 3.98, 2.2, 3.55, facade, 16).name = 'Cot_Dien';
  [0.6, 1.0, 1.4].forEach(y => box(0.2, 0.2, 0.01, M(y === 1.0 ? 0xffffff : 0xd32a2a), 3.98, y, 3.65, facade));
  const mir = cyl(0.26, 0.26, 0.04, CHROME, 3.72, 2.35, 3.78, facade, 28); mir.rotation.x = Math.PI / 2; mir.rotation.z = 0.8;
  const mrim = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.025, 8, 28), BLACK); mrim.position.set(3.72, 2.35, 3.78); mrim.rotation.y = 0.8; facade.add(mrim);
  tube([3.98, 2.35, 3.55], [3.8, 2.35, 3.7], 0.02, BLACK, facade);

  // ---------------- đồ vật dùng chung ----------------
  function slatChair(x, z, ry, p) {
    const g = grp('Ghe_Go', p); g.position.set(x, 0, z); g.rotation.y = ry;
    [-0.13, 0, 0.13].forEach(dz => box(0.4, 0.022, 0.11, mSlat, 0, 0.46, dz, g));
    [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]].forEach(([dx, dz]) => tube([dx, 0, dz], [dx, 0.45, dz], 0.012, STEEL, g, 6));
    [-0.18, 0.18].forEach(dx => { tube([dx, 0.45, -0.17], [dx, 0.88, -0.21], 0.012, STEEL, g, 6); tube([dx, 0.18, -0.17], [dx, 0.18, 0.17], 0.008, STEEL, g, 6); });
    tube([-0.18, 0.43, 0.17], [0.18, 0.43, 0.17], 0.01, STEEL, g, 6);
    [0.6, 0.71, 0.82].forEach(y => box(0.38, 0.075, 0.018, mSlat, 0, y, -0.2 - (y - 0.6) * 0.09, g));
    return g;
  }
  function greenChair(x, z, ry, p, s) {
    const g = grp('Ghe_Xanh', p); g.position.set(x, 0, z); g.rotation.y = ry;
    rbox(0.42, 0.05, 0.4, 0.02, GREEN, 0, s, 0, g);
    [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]].forEach(([dx, dz]) => tube([dx, 0, dz], [dx, s, dz], 0.011, BLACK, g, 6));
    [-0.18, 0.18].forEach(dx => tube([dx, s, -0.18], [dx, s + 0.42, -0.21], 0.011, BLACK, g, 6));
    tube([-0.18, s * 0.35, 0.17], [0.18, s * 0.35, 0.17], 0.009, BLACK, g, 6);
    const bk = rbox(0.4, 0.22, 0.04, 0.015, GREEN, 0, s + 0.3, -0.21, g); bk.rotation.x = 0.08;
    return g;
  }
  function oldTable(name, x, z, w, d, h, ry, top, p, legM) {
    const g = grp(name, p); g.position.set(x, 0, z); g.rotation.y = ry || 0;
    rbox(w, 0.045, d, 0.012, top || mOld, 0, h - 0.022, 0, g);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => box(0.03, h - 0.045, 0.03, legM || BLACK, sx * (w / 2 - 0.06), (h - 0.045) / 2, sz * (d / 2 - 0.06), g));
    box(w - 0.12, 0.025, 0.02, legM || BLACK, 0, h * 0.28, d / 2 - 0.06, g); box(w - 0.12, 0.025, 0.02, legM || BLACK, 0, h * 0.28, -d / 2 + 0.06, g);
    box(w - 0.1, 0.04, 0.02, legM || BLACK, 0, h - 0.07, d / 2 - 0.05, g); box(w - 0.1, 0.04, 0.02, legM || BLACK, 0, h - 0.07, -d / 2 + 0.05, g);
    return g;
  }
  function floorFan(x, z, ry, p) {
    const g = grp('Quat_Cay', p); g.position.set(x, 0, z); g.rotation.y = ry;
    cyl(0.17, 0.2, 0.05, BLACK, 0, 0.025, 0, g, 24); cyl(0.016, 0.02, 0.95, STEEL, 0, 0.52, 0, g, 8);
    rbox(0.13, 0.14, 0.2, 0.04, BLACK, 0, 1.06, -0.05, g);
    const hub = cyl(0.05, 0.05, 0.05, BLACK, 0, 1.06, 0.08, g, 14); hub.rotation.x = Math.PI / 2;
    [0, 1, 2].forEach(i => { const bl = sph(0.1, M(0x2a2a2a, { side: THREE.DoubleSide }), Math.cos(i * 2.094) * 0.1, 1.06 + Math.sin(i * 2.094) * 0.1, 0.09, g, 10, 6); bl.scale.set(1, 0.5, 0.12); bl.rotation.z = i * 2.094; });
    [0.24, 0.17, 0.1].forEach((r, i) => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.005, 4, 32), BLACK); t.position.set(0, 1.06, 0.13 - i * 0.004); g.add(t); });
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; tube([0, 1.06, 0.135], [Math.cos(a) * 0.24, 1.06 + Math.sin(a) * 0.24, 0.12], 0.003, BLACK, g, 3); }
    return g;
  }
  function pendant(x, z, y, p, big) {
    const g = grp('Den_Tha', p);
    tube([x, H, z], [x, y, z], 0.005, BLACK, g, 4);
    const r = big ? 0.27 : 0.19;
    const d = new THREE.Mesh(domeGeo(r, r * 0.8), M(0xbcc1c5, { metalness: 0.75, roughness: 0.28, side: THREE.DoubleSide })); d.position.set(x, y, z); g.add(d);
    sph(0.055, WARM, x, y - r * 0.55, z, g);
    const pl = new THREE.PointLight(0xffc27a, big ? 1.1 : 0.8, 5.5, 2); pl.position.set(x, y - r * 0.8 - 0.05, z); lights.add(pl);
    return g;
  }
  function pottedPlant(x, z, s, p, potM, kind) {
    const g = grp('Chau_Cay', p); g.position.set(x, 0, z); g.scale.setScalar(s);
    const pot = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.16, 0], [0.2, 0.32], [0.22, 0.34], [0.22, 0.37], [0.18, 0.37], [0.18, 0.33]].map(([a, b]) => new THREE.Vector2(a, b)), 20), potM || M(0x9a5634, { roughness: 0.8 }));
    g.add(pot); cyl(0.18, 0.18, 0.01, M(0x3a2a1e), 0, 0.33, 0, g, 16);
    const n = kind === 'big' ? 9 : 12;
    for (let i = 0; i < n; i++) {
      const a = i * 2.4 + rnd() * 0.4, tilt = 0.35 + rnd() * 0.5, len = (kind === 'big' ? 0.55 : 0.3) + rnd() * 0.25;
      const tip = [Math.cos(a) * Math.sin(tilt) * len, 0.34 + Math.cos(tilt) * len, Math.sin(a) * Math.sin(tilt) * len];
      tube([0, 0.34, 0], tip, 0.006, LEAF3, g, 4);
      if (kind === 'big') leaf(tip[0], tip[1], tip[2], 0.22, 0.42, -a + Math.PI / 2, 0.9 - tilt, i % 2 ? LEAF : LEAF2, g, 'heart');
      else leaf(tip[0], tip[1], tip[2], 0.09, 0.2, -a + Math.PI / 2, 1.0 - tilt, i % 3 ? LEAF2 : LEAF, g);
    }
    return g;
  }
  function vine(x, y, z, len, p, dirX, dirZ) {
    const g = grp('Day_Leo', p); const steps = Math.floor(len / 0.07);
    let cx = x, cz = z;
    for (let i = 0; i < steps; i++) {
      const yy = y - i * 0.07; cx += (rnd() - 0.5) * 0.02 + (dirX || 0) * 0.002; cz += (rnd() - 0.5) * 0.02 + (dirZ || 0) * 0.002;
      leaf(cx, yy, cz, 0.05, 0.08, rnd() * 6.28, -0.6 + rnd() * 0.5, i % 3 ? LEAF : LEAF2, g, 'heart');
    }
    return g;
  }
  function hangPlant(x, y, z, p) {
    const g = grp('Chau_Treo', p);
    [0, 2.09, 4.19].forEach(a => tube([x, H, z], [x + Math.cos(a) * 0.09, y, z + Math.sin(a) * 0.09], 0.002, BLACK, g, 3));
    const pot = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.07, 0], [0.11, 0.13], [0.115, 0.14]].map(([a, b]) => new THREE.Vector2(a, b)), 16), M(0xa0412c));
    pot.position.set(x, y - 0.14, z); g.add(pot);
    for (let i = 0; i < 6; i++) { const a = i * 1.05; vine(x + Math.cos(a) * 0.1, y - 0.05, z + Math.sin(a) * 0.1, 0.3 + rnd() * 0.5, g); }
    for (let i = 0; i < 8; i++) leaf(x + (rnd() - 0.5) * 0.12, y + 0.02, z + (rnd() - 0.5) * 0.12, 0.06, 0.1, rnd() * 6.28, 0.3, LEAF2, g, 'heart');
    return g;
  }
  function jars(x0, x1, y, z, p) {
    for (let x = x0; x < x1; x += 0.08 + rnd() * 0.06) {
      const h = 0.1 + rnd() * 0.12;
      if (rnd() > 0.5) { cyl(0.035, 0.035, h, GLASSJAR, x, y + h / 2, z, p, 12); cyl(0.037, 0.037, 0.02, M([0x2b2b2b, 0xb08a4a, 0xd8d0c0][Math.floor(rnd() * 3)]), x, y + h + 0.01, z, p, 12); if (rnd() > 0.4) cyl(0.03, 0.03, h * 0.5, M([0x5a3a20, 0xc8a24a, 0x7a2a22, 0x3f5d3a][Math.floor(rnd() * 4)]), x, y + h * 0.25, z, p, 10); }
      else { const w = 0.03 + rnd() * 0.03; box(w, h + 0.06, 0.15, M([0x8a3b2b, 0x2d4b6a, 0xc8a24a, 0x3f5d3a, 0xe8e2d0, 0x6a4a7a][Math.floor(rnd() * 6)], { roughness: 0.6 }), x, y + (h + 0.06) / 2, z, p).rotation.z = rnd() > 0.85 ? 0.2 : 0; }
    }
  }
  function cup(x, y, z, p, kind) {
    if (kind === 'glass') { cyl(0.035, 0.03, 0.11, GLASSJAR, x, y + 0.055, z, p, 12); cyl(0.032, 0.028, 0.07, M(kind === 'glass' ? 0x8a5a36 : 0x3a2414, { roughness: 0.3 }), x, y + 0.04, z, p, 12); tube([x + 0.01, y + 0.05, z], [x + 0.03, y + 0.17, z - 0.01], 0.003, M(0xe0e0e0), p, 4); }
    else { cyl(0.065, 0.06, 0.008, CREAM, x, y + 0.004, z, p, 16); cyl(0.04, 0.032, 0.06, CREAM, x, y + 0.038, z, p, 16); cyl(0.036, 0.036, 0.002, M(0x6a4024), x, y + 0.066, z, p, 14); const h = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 4, 10, Math.PI), CREAM); h.position.set(x + 0.04, y + 0.04, z); h.rotation.z = -Math.PI / 2; p.add(h); }
  }
  function laptop(x, y, z, ry, p) {
    const g = grp('Laptop', p); g.position.set(x, y, z); g.rotation.y = ry;
    rbox(0.32, 0.015, 0.22, 0.006, M(0xa9adb2, { metalness: 0.7, roughness: 0.35 }), 0, 0.008, 0, g);
    const lid = grp('Man', g); lid.position.set(0, 0.015, -0.11); lid.rotation.x = -0.32;
    rbox(0.32, 0.21, 0.008, 0.006, M(0xa9adb2, { metalness: 0.7, roughness: 0.35 }), 0, 0.105, 0, lid);
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.18), M(0xffffff, { map: canv.screen, emissive: 0xffffff, emissiveMap: canv.screen, emissiveIntensity: 0.5 })); sc.position.set(0, 0.105, 0.0045); lid.add(sc);
    return g;
  }

  // ---------------- khu cửa kính trước ----------------
  const front = grp('Khu_Cua_Kinh_Truoc');
  [-1.175, -0.525, 0.125, 0.775].forEach((x, i) => {
    const n = 'Ban_0' + (i + 1); const g = grp(n, front);
    rbox(0.64, 0.05, 0.38, 0.01, mOld, x, 0.915, 2.78, g);
    box(0.03, 0.9, 0.03, BLACK, x - 0.29, 0.45, 2.65, g); box(0.03, 0.9, 0.03, BLACK, x - 0.29, 0.45, 2.92, g);
    greenChair(x, 2.25, 0, front, 0.62);
    seatAt(n, x, 2.18, x, 0.98, 2.95);
  });
  cup(0.35, 0.94, 2.82, front, 'glass'); cup(-0.85, 0.94, 2.84, front);
  rbox(0.2, 0.02, 0.26, 0.004, M(0xe8e2d0), 0.55, 0.95, 2.8, front).rotation.y = 0.3;
  [2.05, 2.45].forEach(y => { rbox(2.8, 0.035, 0.26, 0.008, WOOD, -0.2, y, 2.88, front); jars(-1.5, 1.1, y + 0.018, 2.88, front); });
  [-1.55, -0.2, 1.15].forEach(x => [2.05, 2.45].forEach(y => box(0.02, 0.12, 0.2, BLACK, x, y - 0.07, 2.92, front)));
  [-1.35, 1.0].forEach(x => { const g = grp('Den_Ban', front); cyl(0.07, 0.075, 0.015, STEEL, x, 0.95, 2.85, g, 18); tube([x, 0.95, 2.85], [x, 1.3, 2.88], 0.007, STEEL, g, 6); const c = new THREE.Mesh(domeGeo(0.08, 0.12), M(0xc3c7cb, { metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide })); c.position.set(x, 1.32, 2.82); c.rotation.x = 0.7; g.add(c); sph(0.025, WARM, x, 1.27, 2.79, g); });
  [-0.9, -0.2, 0.5].forEach(x => { const c = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 28), [M(0x8f9396, { metalness: 0.7, roughness: 0.3 }), M(0xffffff, { map: canv.clock }), M(0x8f9396)], x, 3.0, 2.98, front); c.rotation.x = -Math.PI / 2; const rim = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 6, 28), STEEL); rim.position.set(x, 3.0, 2.965); front.add(rim); });

  // ---------------- góc cột ----------------
  const corner = grp('Goc_Cot');
  rbox(0.55, 0.72, 0.45, 0.015, TEAL, 1.55, 0.36, 2.74, corner, 'Tu_Ho_So');
  [0.17, 0.4, 0.62].forEach(y => { box(0.5, 0.004, 0.01, M(0x1f5a62), 1.55, y + 0.1, 2.513, corner); box(0.12, 0.02, 0.015, CHROME, 1.55, y, 2.51, corner); });
  rbox(0.42, 0.36, 0.36, 0.04, M(0x2a2a2a, { roughness: 0.5 }), 1.5, 0.9, 2.76, corner, 'TV_Cu');
  const scr = sph(0.3, M(0x2c3438, { roughness: 0.15, metalness: 0.3 }), 1.5, 0.91, 2.83, corner, 20, 14); scr.scale.set(0.5, 0.4, 0.22);
  [0, 1, 2].forEach(i => rbox(0.22, 0.035, 0.3, 0.005, M([0xd8cfb8, 0xb94a3a, 0x3a5a7a][i]), 1.73, 0.735 + i * 0.037, 2.74, corner));
  mesh(new THREE.BoxGeometry(0.36, 0.46, 0.03), [BLACK, BLACK, BLACK, BLACK, BLACK, M(0xffffff, { map: canv.sketch })], 1.95, 1.55, 2.985, corner, 'Tranh_Ky_Hoa');
  rbox(0.26, 0.36, 0.05, 0.01, M(0xeeeeea), 1.58, 1.95, 2.975, corner, 'Hop_Dien');
  [1.48, 1.58, 1.68].forEach(x => box(0.05, 0.08, 0.02, M(0xd8d8d2), x, 1.62, 2.98, corner));
  cyl(0.18, 0.15, 0.5, mOld, 2.1, 0.25, 2.65, corner, 16);
  const df = grp('Quat_Ban', corner); rbox(0.18, 0.04, 0.14, 0.01, TEAL, 2.1, 0.52, 2.65, df); const fh = cyl(0.13, 0.13, 0.06, M(0x6fb3a8, { roughness: 0.4 }), 2.1, 0.74, 2.62, df, 24); fh.rotation.x = Math.PI / 2;
  hangPlant(1.25, 2.3, 2.7, corner);

  // ---------------- cửa sổ bên ----------------
  const side = grp('Khu_Cua_Kinh_Ben');
  [[1.45, 'Ban_05'], [2.3, 'Ban_06']].forEach(([z, n]) => {
    const g = grp(n, side);
    rbox(0.4, 0.05, 0.84, 0.01, mOld, 3.25, 0.755, z, g);
    box(0.03, 0.73, 0.03, BLACK, 3.1, 0.365, z - 0.38, g);
    slatChair(2.8, z, Math.PI / 2, side);
    seatAt(n, 2.72, z, 3.45, 0.85, z);
  });
  cup(3.3, 0.78, 1.9, side, 'glass');
  rbox(0.24, 0.035, 1.9, 0.008, WOOD, 3.38, 2.28, 1.85, side);
  for (let z = 1.0; z < 2.75; z += 0.1) { const h = 0.08 + rnd() * 0.14; cyl(0.033, 0.033, h, GLASSJAR, 3.38, 2.3 + h / 2, z, side, 12); cyl(0.035, 0.035, 0.018, M(0x2b2b2b), 3.38, 2.31 + h, z, side, 12); }
  [[3.05, 2.1], [3.05, 2.6]].forEach(([x, z]) => { const g = grp('Den_Luoi', side); tube([x, H, z], [x, 2.82, z], 0.004, BLACK, g, 4); cyl(0.11, 0.11, 0.4, M(0xb07a3a, { metalness: 0.7, roughness: 0.35, transparent: true, opacity: 0.85, side: THREE.DoubleSide, wireframe: false }), x, 2.62, z, g, 20); sph(0.045, WARM, x, 2.5, z, g); });
  rbox(0.25, 0.3, 0.9, 0.04, M(0xf1f1ee, { roughness: 0.4 }), 3.37, 2.95, -1.9, side, 'May_Lanh');
  box(0.02, 0.04, 0.8, M(0xcfcfca), 3.24, 2.84, -1.9, side);
  pottedPlant(3.95, 2.5, 0.9, side); pottedPlant(3.95, 1.4, 0.8, side);

  // ---------------- tường gỗ trái ----------------
  const left = grp('Tuong_Go_Trai');
  box(0.05, 3.0, 2.4, mPlanks, -3.47, 1.5, 1.8, left, 'Vach_Go');
  const gt = grp('Dan_Guitar', left); gt.position.set(-3.38, 1.18, 1.45); gt.rotation.y = Math.PI / 2;
  const gs = new THREE.Shape(); gs.moveTo(0, -0.3); gs.bezierCurveTo(0.24, -0.3, 0.25, -0.05, 0.13, 0.02); gs.bezierCurveTo(0.2, 0.1, 0.2, 0.26, 0, 0.27); gs.bezierCurveTo(-0.2, 0.26, -0.2, 0.1, -0.13, 0.02); gs.bezierCurveTo(-0.25, -0.05, -0.24, -0.3, 0, -0.3);
  const gbody = new THREE.Mesh(new THREE.ExtrudeGeometry(gs, { depth: 0.08, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 10 }), M(0x5d6b78, { roughness: 0.35 })); gbody.position.z = -0.04; gt.add(gbody);
  cyl(0.045, 0.045, 0.01, BLACK, 0, 0.0, 0.046, gt, 20).rotation.x = Math.PI / 2;
  box(0.05, 0.5, 0.025, M(0x2a1d14), 0, 0.5, 0.03, gt); rbox(0.08, 0.15, 0.025, 0.01, M(0x2a1d14), 0, 0.82, 0.03, gt);
  box(0.06, 0.012, 0.02, BLACK, 0, -0.16, 0.05, gt);
  for (let i = 0; i < 6; i++) tube([-0.02 + i * 0.008, -0.16, 0.055], [-0.02 + i * 0.008, 0.74, 0.055], 0.0012, M(0xdcdcdc, { metalness: 0.9 }), gt, 3);
  mesh(new THREE.BoxGeometry(0.03, 0.42, 0.6), [M(0xffffff, { map: canv.oldphoto }), BLACK, BLACK, BLACK, BLACK, BLACK], -3.43, 1.55, 2.35, left, 'Anh_Cu');
  tube([-3.4, 2.3, 1.2], [-3.4, 2.3, 2.8], 0.015, BLACK, left);
  [1.4, 1.8, 2.2, 2.6].forEach(z => { const s = cyl(0.04, 0.05, 0.13, STEEL, -3.3, 2.24, z, left, 14); s.rotation.z = 0.7; sph(0.03, WARM, -3.26, 2.2, z, left); });

  // tường trắng giữa
  const lw = grp('Tuong_Trang_Trai');
  const sg = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 32), [M(0x2a2a2a), M(0xc8302a, { roughness: 0.35 }), M(0x2a2a2a)], -3.47, 1.8, 0.1, lw); sg.rotation.z = Math.PI / 2;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.012, 6, 32), M(0xf2efe6)); ring.position.set(-3.44, 1.8, 0.1); ring.rotation.y = Math.PI / 2; lw.add(ring);
  rbox(0.45, 0.75, 0.45, 0.02, M(0xece9e1, { roughness: 0.6 }), -3.25, 0.375, -0.45, lw, 'Tu_Trang');
  box(0.002, 0.6, 0.38, M(0xcfcac0), -3.025, 0.38, -0.45, lw); cyl(0.012, 0.012, 0.02, STEEL, -3.02, 0.55, -0.38, lw, 8).rotation.z = Math.PI / 2;
  const lampBase = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.07, 0], [0.07, 0.02], [0.03, 0.05], [0.045, 0.12], [0.02, 0.2], [0.02, 0.32], [0, 0.32]].map(([a, b]) => new THREE.Vector2(a, b)), 16), M(0x4a2a1a, { roughness: 0.4 })); lampBase.position.set(-3.25, 0.75, -0.45); lw.add(lampBase);
  cyl(0.1, 0.19, 0.22, M(0xf0a050, { emissive: 0xe0782a, emissiveIntensity: 0.9, side: THREE.DoubleSide }), -3.25, 1.17, -0.45, lw, 24);
  const ll = new THREE.PointLight(0xff9a4a, 0.7, 3, 2); ll.position.set(-3.1, 1.12, -0.45); lights.add(ll);
  rbox(0.05, 2.1, 0.75, 0.01, M(0x3a2a1e, { roughness: 0.6 }), -3.47, 1.05, -2.45, lw, 'Cua_Toilet');
  cyl(0.015, 0.015, 0.05, CHROME, -3.43, 1.0, -2.2, lw, 8).rotation.z = Math.PI / 2;
  box(0.03, 0.12, 0.4, M(0x1e1e1e), -3.45, 2.25, -2.45, lw);
  const hb = grp('Gian_Den_Roi', lw);
  rbox(0.9, 0.05, 0.38, 0.01, WOOD, -2.5, 2.75, -0.9, hb);
  [-2.85, -2.15].forEach(x => tube([x, H, -0.9], [x, 2.77, -0.9], 0.004, BLACK, hb, 4));
  [-2.8, -2.6, -2.4, -2.2].forEach(x => { cyl(0.045, 0.06, 0.13, STEEL, x, 2.66, -0.9, hb, 14); sph(0.035, WARM, x, 2.6, -0.9, hb); });
  const hbl = new THREE.PointLight(0xffc27a, 0.8, 4.5, 2); hbl.position.set(-2.5, 2.4, -0.9); lights.add(hbl);

  // gác lửng
  const mez = grp('Gac_Lung');
  rbox(2.9, 0.3, 0.6, 0.015, M(0xe9e6dc, { roughness: 0.7 }), -2.05, 2.45, -2.72, mez);
  const flag = mesh(new THREE.PlaneGeometry(1.05, 0.7, 12, 1), M(0xffffff, { map: canv.flag, side: THREE.DoubleSide }), -2.0, 2.95, -2.97, mez, 'Co');
  { const ps = flag.geometry.attributes.position; for (let i = 0; i < ps.count; i++) ps.setZ(i, Math.sin(ps.getX(i) * 9) * 0.015); flag.geometry.computeVertexNormals(); }
  [-3.1, -1.0].forEach(x => { rbox(0.3, 0.36, 0.28, 0.02, BLACK, x, 2.78, -2.75, mez); const c = cyl(0.08, 0.08, 0.01, M(0x333333), x, 2.74, -2.6, mez, 18); c.rotation.x = Math.PI / 2; });
  hangPlant(-0.85, 2.25, -2.5, mez);
  const cm = cyl(0.14, 0.14, 0.025, CHROME, -1.1, 2.15, -2.42, mez, 20); cm.rotation.x = Math.PI / 2.3;

  // ---------------- quầy ----------------
  const bar = grp('Quay');
  box(2.6, 0.95, 0.6, mAlu, 1.5, 0.475, -2.2, bar, 'Quay_Op_Nhom');
  box(2.62, 0.05, 0.02, M(0x4a2a1a), 1.5, 0.82, -1.89, bar);
  rbox(2.72, 0.06, 0.72, 0.012, mOld, 1.5, 0.98, -2.2, bar);
  box(2.6, 0.9, 0.35, DARK, 1.5, 0.45, -2.82, bar);
  jars(0.3, 0.95, 1.01, -2.05, bar);
  const em = grp('May_Pha', bar);
  rbox(0.5, 0.42, 0.42, 0.03, M(0xb9bdc1, { metalness: 0.85, roughness: 0.25 }), 1.25, 1.12, -2.8, em);
  [1.15, 1.35].forEach(x => { cyl(0.025, 0.03, 0.05, BLACK, x, 0.98, -2.55, em, 10); tube([x, 0.98, -2.55], [x, 0.98, -2.42], 0.008, BLACK, em, 6); });
  const kettle = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.08, 0], [0.09, 0.05], [0.08, 0.18], [0.04, 0.22], [0, 0.23]].map(([a, b]) => new THREE.Vector2(a, b)), 20), CHROME); kettle.position.set(1.9, 1.01, -2.1); bar.add(kettle);
  tube([1.97, 1.1, -2.1], [2.06, 1.22, -2.1], 0.008, CHROME, bar, 6);
  const grinder = grp('May_Xay', bar); cyl(0.06, 0.07, 0.18, BLACK, 0.6, 1.1, -2.15, grinder, 14); cyl(0.05, 0.08, 0.14, GLASSJAR, 0.6, 1.26, -2.15, grinder, 14);
  const vase = cyl(0.05, 0.04, 0.2, GLASSJAR, 2.35, 1.11, -2.05, bar, 14);
  for (let i = 0; i < 7; i++) { const tx = 2.35 + (rnd() - 0.5) * 0.22, ty = 1.36 + rnd() * 0.14, tz = -2.05 + (rnd() - 0.5) * 0.16; tube([2.35, 1.12, -2.05], [tx, ty, tz], 0.004, LEAF3, bar, 3); for (let k = 0; k < 5; k++) leaf(tx, ty, tz, 0.035, 0.07, k * 1.25, 0.5, M(0xe8762c, { side: THREE.DoubleSide, roughness: 0.5 }), bar, 'long'); }
  [1.55, 1.9, 2.25].forEach(y => { rbox(1.4, 0.03, 0.22, 0.006, BLACK, 1.2, y, -2.89, bar); jars(0.55, 1.85, y + 0.015, -2.89, bar); [0.55, 1.85].forEach(x => box(0.02, 0.1, 0.18, BLACK, x, y - 0.06, -2.9, bar)); });
  [0.55, 1.9].forEach(x => {
    const g = grp('Den_Xep', bar); let px = x, pz = -2.98;
    for (let k = 0; k < 4; k++) { const nx = x + (k % 2 ? 0.07 : -0.07), nz = pz + 0.12; tube([px, 2.4, pz], [nx, 2.4, nz], 0.006, BLACK, g, 4); tube([px + (k % 2 ? -0.14 : 0.14), 2.4, pz], [nx, 2.4, nz], 0.006, BLACK, g, 4); px = nx; pz = nz; }
    const d = new THREE.Mesh(domeGeo(0.17, 0.12), M(0xeeeeea, { side: THREE.DoubleSide, roughness: 0.4 })); d.position.set(x, 2.42, -2.5); g.add(d); sph(0.045, WARM, x, 2.34, -2.5, g);
    const pl = new THREE.PointLight(0xffd29a, 0.8, 4, 2); pl.position.set(x, 2.25, -2.4); lights.add(pl);
  });
  box(0.6, 1.0, 0.01, M(0xffffff, { map: canv.kraft }), 0.0, 1.95, -2.99, bar, 'Thuc_Don');
  tube([-0.36, 2.47, -2.97], [0.36, 2.47, -2.97], 0.015, WOOD, bar, 8);
  const fr = grp('Tu_Lanh', bar);
  rbox(0.6, 1.85, 0.6, 0.03, M(0xf2f2f0, { roughness: 0.4 }), 3.15, 0.925, -2.65, fr); box(0.58, 0.18, 0.02, M(0x2a5aa8), 3.15, 1.73, -2.34, fr);
  box(0.5, 1.35, 0.01, M(0xcfeaf5, { emissive: 0x9fd8ee, emissiveIntensity: 0.45, transparent: true, opacity: 0.6 }), 3.15, 0.95, -2.345, fr);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) cyl(0.025, 0.028, 0.18, M([0xc0392b, 0x27ae60, 0xf39c12, 0x2980b9][(r + c) % 4], { roughness: 0.3 }), 2.95 + c * 0.1, 0.42 + r * 0.33, -2.42, fr, 10);
  const pl1 = grp('Cay_Chuoi'); pl1.position.set(0.12, 0, -0.15); // dịch sát quầy cho lối sang phòng sau rộng hơn
  rbox(0.45, 0.55, 0.45, 0.02, M(0x8e9396, { metalness: 0.6, roughness: 0.4 }), -0.1, 0.275, -1.6, pl1);
  for (let i = 0; i < 7; i++) { const a = i * 0.9, h = 0.7 + i * 0.12; tube([-0.1, 0.55, -1.6], [-0.1 + Math.cos(a) * 0.12, h, -1.6 + Math.sin(a) * 0.12], 0.015, LEAF3, pl1, 6); leaf(-0.1 + Math.cos(a) * 0.12, h, -1.6 + Math.sin(a) * 0.12, 0.16, 0.75, -a + Math.PI / 2, 0.25 + (i % 3) * 0.15, i % 2 ? LEAF : LEAF2, pl1, 'long'); }
  const fl3 = grp('Den_Cay', pl1); cyl(0.14, 0.16, 0.03, M(0x2f5a44), 0.25, 0.015, -1.2, fl3, 18); tube([0.25, 0, -1.2], [0.25, 1.55, -1.2], 0.018, M(0x2f5a44, { metalness: 0.4 }), fl3, 10);
  const shade = new THREE.Mesh(domeGeo(0.13, 0.12), M(0xf2efe6, { emissive: 0xfff1d0, emissiveIntensity: 0.35, side: THREE.DoubleSide })); shade.position.set(0.25, 1.68, -1.2); fl3.add(shade); sph(0.04, WARM, 0.25, 1.6, -1.2, fl3);

  // ---------------- sofa ----------------
  const sofa = grp('Sofa_Da');
  box(2.1, 0.22, 0.65, M(0xffffff, { map: canv.crate }), 1.4, 0.11, -1.55, sofa, 'Ke_Pallet_Trang');
  [0.9, 1.9].forEach(x => { rbox(0.96, 0.16, 0.6, 0.06, mLeather, x, 0.3, -1.52, sofa); const bk = rbox(0.96, 0.46, 0.17, 0.07, mLeather, x, 0.6, -1.79, sofa); bk.rotation.x = -0.08; [-0.25, 0.25].forEach(dx => sph(0.015, M(0x6a3a1e), x + dx, 0.66, -1.69, sofa, 6, 4)); });
  [0.36, 2.44].forEach(x => rbox(0.12, 0.3, 0.62, 0.05, mLeather, x, 0.38, -1.55, sofa));
  oldTable('Ban_09', 1.4, -0.82, 1.15, 0.6, 0.66, 0, mOld, sofa);
  cup(1.2, 0.66, -0.85, sofa, 'glass'); cup(1.6, 0.66, -0.75, sofa);
  slatChair(1.1, -0.2, Math.PI, sofa); slatChair(1.75, -0.2, Math.PI, sofa);
  seatAt('Ban_09', 1.4, -1.45, 1.4, 0.7, -0.6);

  // ---------------- giữa quán ----------------
  const midg = grp('Khu_Giua');
  oldTable('Ban_07', -1.1, -0.35, 1.05, 0.6, 0.74, 0.08, mOld, midg);
  slatChair(-1.35, -1.0, 0.05, midg); slatChair(-0.85, 0.3, Math.PI + 0.05, midg);
  cup(-0.85, 0.74, -0.25, midg); seatAt('Ban_07', -1.35, -1.05, -1.1, 0.78, -0.2);
  oldTable('Ban_08', 0.75, 0.95, 1.0, 0.58, 0.74, 0, mOld, midg);
  slatChair(0.55, 0.38, 0, midg); slatChair(1.0, 0.38, 0, midg);
  cup(0.95, 0.74, 1.0, midg, 'glass'); rbox(0.18, 0.015, 0.24, 0.003, M(0x2d4b6a), 0.5, 0.75, 0.95, midg).rotation.y = -0.2;
  seatAt('Ban_08', 0.55, 0.3, 0.75, 0.78, 1.1);
  const bt = oldTable('Ban_10', -2.45, 0.6, 0.7, 0.5, 0.6, 0, BLACK, midg);
  box(0.62, 0.01, 0.42, M(0xffffff, { map: canv.lattice }), 0, 0.605, 0, bt);
  slatChair(-2.45, 1.15, Math.PI, midg); slatChair(-2.0, 0.05, -0.5, midg);
  seatAt('Ban_10', -2.45, 1.2, -2.45, 0.65, 0.5);
  // mèo
  const cat = grp('Meo', midg); cat.position.set(-1.25, 0.765, -0.35); cat.rotation.y = 0.4;
  const fur = M(0x9c8668, { roughness: 0.9 }), furD = M(0x5e4c38, { roughness: 0.9 });
  const cb = sph(0.1, fur, 0, 0.09, 0, cat, 14, 10); cb.scale.set(0.85, 0.95, 1.45);
  const ch2 = sph(0.075, fur, 0, 0.21, 0.12, cat, 14, 10); ch2.scale.set(1, 0.9, 0.95);
  sph(0.03, M(0xd8c8b0), 0, 0.19, 0.185, cat, 8, 6);
  [-1, 1].forEach(s => { const e = mesh(new THREE.ConeGeometry(0.028, 0.06, 6), fur, s * 0.045, 0.29, 0.11, cat); e.rotation.z = -s * 0.25; sph(0.008, BLACK, s * 0.028, 0.225, 0.19, cat, 6, 4); });
  [[-0.05, 0.1], [0.05, 0.1], [-0.05, -0.08], [0.05, -0.08]].forEach(([x, z]) => cyl(0.02, 0.02, 0.06, fur, x, 0.03, z, cat, 6));
  const tcurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.08, -0.14), new THREE.Vector3(0.06, 0.04, -0.22), new THREE.Vector3(0.14, 0.02, -0.2), new THREE.Vector3(0.18, 0.05, -0.1)]);
  mesh(new THREE.TubeGeometry(tcurve, 12, 0.014, 6), furD, 0, 0, 0, cat);
  [-0.03, 0.03].forEach(dx => box(0.008, 0.002, 0.1, furD, dx, 0.185, 0.0, cat));

  floorFan(-3.1, 2.75, 2.4, midg); // dời vào góc, không chắn lối
  const ceilg = grp('Den_Tran');
  pendant(2.55, 1.55, 2.75, ceilg, true); pendant(-0.4, 1.9, 2.75, ceilg, true); pendant(-1.2, -0.35, 2.6, ceilg); pendant(0.75, 0.95, 2.6, ceilg);
  const DISCO = M(0xdcdcdc, { metalness: 0.9, roughness: 0.18, flatShading: true });
  [[0.1, 1.5, 2.85], [1.6, -0.6, 2.9]].forEach(([x, z, y]) => { tube([x, H, z], [x, y, z], 0.004, BLACK, ceilg, 4); mesh(new THREE.IcosahedronGeometry(0.15, 2), DISCO, x, y - 0.15, z, ceilg, 'Qua_Cau_Disco'); });

  // ---------------- phòng sau ----------------
  const back = grp('Phong_Sau');
  for (let r = 0; r < 4; r++) {
    rbox(1.6, 0.03, 0.25, 0.005, WOOD, -2.55, 0.9 + r * 0.42, -5.86, back);
    for (let x = -3.25; x < -1.85; x += 0.15 + rnd() * 0.1) {
      const w = 0.08 + rnd() * 0.1, h = 0.1 + rnd() * 0.15, k = rnd();
      if (k < 0.2) { const r2 = cyl(w * 0.4, w * 0.4, 0.04, M(0x2b2b2b), x, 0.92 + r * 0.42 + w * 0.4, -5.8, back, 14); r2.rotation.x = Math.PI / 2; }
      else box(w, h, 0.14, M([0x5a3a22, 0x8a6a3a, 0x2b2b2b, 0xb9a27a, 0x7a2a22][Math.floor(rnd() * 5)], { roughness: 0.6 }), x, 0.915 + r * 0.42 + h / 2, -5.86, back);
    }
  }
  for (let r = 0; r < 3; r++) { rbox(0.25, 0.03, 2.0, 0.005, WOOD, -3.36, 1.1 + r * 0.45, -4.6, back); for (let z = -5.5; z < -3.7; z += 0.18 + rnd() * 0.1) { const h = 0.1 + rnd() * 0.14; box(0.14, h, 0.1, M([0x6a4a2a, 0x2b2b2b, 0xc9b48a, 0x8a3a2a][Math.floor(rnd() * 4)], { roughness: 0.6 }), -3.36, 1.115 + r * 0.45 + h / 2, z, back); } }
  const chg = grp('Den_Chum', back);
  tube([-2.05, 2.62, -4.5], [-2.05, 2.15, -4.5], 0.006, BLACK, chg, 4);
  const cring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.02, 8, 32), BLACK); cring.rotation.x = Math.PI / 2; cring.position.set(-2.05, 2.1, -4.5); chg.add(cring);
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, x = -2.05 + Math.cos(a) * 0.42, z = -4.5 + Math.sin(a) * 0.42; tube([-2.05, 2.12, -4.5], [x, 2.15, z], 0.008, BLACK, chg, 5); cyl(0.012, 0.012, 0.1, CREAM, x, 2.2, z, chg, 6); sph(0.025, WARM, x, 2.27, z, chg, 8, 6); }
  const chl = new THREE.PointLight(0xffb060, 1.1, 5, 2); chl.position.set(-2.05, 2.0, -4.5); lights.add(chl);
  oldTable('Ban_11', -2.2, -4.2, 0.9, 0.55, 0.72, 0, mOld, back);
  slatChair(-2.2, -3.65, Math.PI, back); slatChair(-2.2, -4.75, 0, back); cup(-2.0, 0.72, -4.15, back);
  seatAt('Ban_11', -2.2, -4.8, -2.2, 0.75, -4.1);
  const arm = grp('Ghe_Nhung_Do', back); const VEL = M(0x8a2424, { roughness: 0.85 });
  rbox(0.6, 0.3, 0.55, 0.06, VEL, -3.05, 0.25, -5.3, arm); rbox(0.6, 0.5, 0.15, 0.06, VEL, -3.05, 0.65, -5.55, arm); [-3.35, -2.75].forEach(x => rbox(0.1, 0.32, 0.55, 0.04, VEL, x, 0.45, -5.3, arm));
  rbox(0.4, 0.6, 0.35, 0.01, WOOD, -3.15, 0.3, -3.5, back);
  cyl(0.05, 0.07, 0.25, M(0x2a2a2a), -3.15, 0.72, -3.5, back, 12);
  cyl(0.1, 0.17, 0.2, M(0xd8482a, { emissive: 0xc0401a, emissiveIntensity: 0.9, side: THREE.DoubleSide }), -3.15, 0.92, -3.5, back, 20);
  mesh(new THREE.BoxGeometry(0.02, 0.9, 0.6), [M(0xffffff, { map: canv.polaroid }), BLACK, BLACK, BLACK, BLACK, BLACK], -0.61, 1.55, -3.6, back, 'Bang_Anh');

  // ---------------- bên ngoài ----------------
  const out = grp('Ben_Ngoai');
  const bike = grp('Xe_Dap', out); bike.position.set(2.75, 0, 3.55);
  const WH = M(0xeeeeea, { roughness: 0.35 });
  [-0.5, 0.5].forEach(dx => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.022, 8, 32), BLACK); t.position.set(dx, 0.34, 0); bike.add(t);
    const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.295, 0.008, 6, 32), CHROME); r2.position.set(dx, 0.34, 0); bike.add(r2);
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; tube([dx, 0.34, (i % 2 ? 0.01 : -0.01)], [dx + Math.cos(a) * 0.29, 0.34 + Math.sin(a) * 0.29, 0], 0.0015, CHROME, bike, 3); }
  });
  const btube = (a, b) => tube([a[0], a[1], 0], [b[0], b[1], 0], 0.017, WH, bike, 8);
  btube([-0.5, 0.34], [-0.1, 0.34]); btube([-0.1, 0.34], [-0.2, 0.8]); btube([-0.1, 0.34], [0.38, 0.72]); btube([0.38, 0.72], [0.5, 0.34]); btube([-0.5, 0.34], [-0.22, 0.75]); btube([0.38, 0.72], [0.42, 0.95]);
  rbox(0.2, 0.05, 0.09, 0.02, M(0x6a3a22, { roughness: 0.5 }), -0.2, 0.83, 0, bike); tube([0.42, 0.96, -0.22], [0.42, 0.96, 0.22], 0.012, CHROME, bike, 8);
  const bsk = rbox(0.28, 0.2, 0.3, 0.01, M(0xffffff, { map: canv.lattice }), 0.62, 0.85, 0, bike); bsk.name = 'Gio_Xe';
  cyl(0.05, 0.05, 0.02, BLACK, 0, 0.34, 0.05, bike, 14).rotation.x = Math.PI / 2;
  pottedPlant(1.0, 3.6, 1.6, out, M(0x5a4636, { roughness: 0.8 }), 'big'); pottedPlant(-2.9, 3.55, 1.2, out); pottedPlant(4.25, 0.95, 1.0, out, null, 'big');
  for (let i = 0; i < 14; i++) vine(1.3 + rnd() * 2.2, 3.25, 3.28, 0.6 + rnd() * 1.1, out);
  for (let i = 0; i < 10; i++) vine(3.78, 3.25, 1.0 + rnd() * 2.2, 0.5 + rnd() * 1.0, out);
  [-1.85, -2.8].forEach(z => {
    const t = oldTable('Ban_Via_He', 4.55, z, 0.5, 0.75, 0.5, 0, BLACK, out); box(0.45, 0.01, 0.7, M(0xffffff, { map: canv.lattice }), 0, 0.505, 0, t);
    slatChair(4.0, z - 0.24, Math.PI / 2, out); slatChair(4.0, z + 0.24, Math.PI / 2, out);
  });
  cup(4.55, 0.5, -1.75, out, 'glass');

  function weld(g) {
    const p = g.attributes.position, nm = g.attributes.normal, uv = g.attributes.uv, n = p.count;
    const map = new Map(), P = [], N = [], U = [], I = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
      const k = [p.getX(i).toFixed(4), p.getY(i).toFixed(4), p.getZ(i).toFixed(4), nm.getX(i).toFixed(2), nm.getY(i).toFixed(2), nm.getZ(i).toFixed(2), uv ? uv.getX(i).toFixed(3) : 0, uv ? uv.getY(i).toFixed(3) : 0].join(',');
      let id = map.get(k);
      if (id === undefined) { id = P.length / 3; map.set(k, id); P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(nm.getX(i), nm.getY(i), nm.getZ(i)); if (uv) U.push(uv.getX(i), uv.getY(i)); else U.push(0, 0); }
      I[i] = id;
    }
    const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); o.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); o.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); o.setIndex(new THREE.BufferAttribute(I, 1)); return o;
  }
  // =============== MỞ RỘNG: SÂN VƯỜN + PHÒNG LÀM VIỆC LỚN ===============
  T.pavers = makeTex(512, (u, v) => {
    const row = Math.floor(v * 8), off = row % 2 ? 0.5 : 0, iu = Math.floor(u * 4 + off), fu = fract(u * 4 + off), fv = fract(v * 8);
    const joint = fu < 0.03 || fv < 0.06 ? 1 : 0, t = hash(iu, row) * 30 + (noise(u * 90, v * 90) - 0.5) * 20;
    return joint ? [96, 92, 84, -1] : [168 + t, 96 + t * 0.6, 70 + t * 0.4, noise(u * 90, v * 90) * 0.3];
  }, 2.5);
  canv.rug = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#8c4a32'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e7d7b8'; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h - 28); g.strokeStyle = '#2f4a5a'; g.lineWidth = 3; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(w / 2, 40 + i * 12); g.lineTo(w - 40 - i * 12, h / 2); g.lineTo(w / 2, h - 40 - i * 12); g.lineTo(40 + i * 12, h / 2); g.closePath(); g.stroke(); } }, true);
  const mPavers = PBR(T.pavers, { roughness: 0.85 });
  const BARK = M(0x5a4232, { roughness: 0.95 }), CANOPY = M(0x2c5f28, { roughness: 0.95, flatShading: true }), CANOPY2 = M(0x3f7633, { roughness: 0.95, flatShading: true });
  const GRASS = M(0x5f8f3e, { roughness: 1 }), SOIL = M(0x3e2e22, { roughness: 1 }), BAMBOO = M(0x7aa04a, { roughness: 0.5 });

  function tree(x, z, h, s, p) {
    const g = grp('Cay_Lon', p); g.position.set(x, 0, z); g.scale.setScalar(s);
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.08, h * 0.35, 0.04), new THREE.Vector3(-0.05, h * 0.7, 0.02), new THREE.Vector3(0.02, h, 0)]);
    mesh(new THREE.TubeGeometry(c, 8, 0.11, 8), BARK, 0, 0, 0, g);
    [[0.6, 0.5, 0.2], [-0.5, 0.6, -0.3], [0.2, 0.75, -0.55], [-0.3, 0.55, 0.5]].forEach(([dx, fy, dz]) => tube([0, h * fy, 0], [dx, h * fy + 0.6, dz], 0.04, BARK, g, 6));
    for (let i = 0; i < 11; i++) { const a = i * 2.3, r = 0.35 + rnd() * 0.75; const k = mesh(new THREE.IcosahedronGeometry(0.55 + rnd() * 0.35, 1), i % 2 ? CANOPY : CANOPY2, Math.cos(a) * r, h + 0.1 + rnd() * 0.8, Math.sin(a) * r, g); k.scale.y = 0.75; }
    return g;
  }
  function bambooClump(x, z, n, p) {
    const g = grp('Tre', p); g.position.set(x, 0, z);
    for (let i = 0; i < n; i++) { const bx = (rnd() - 0.5) * 0.5, bz = (rnd() - 0.5) * 0.3, h = 2.0 + rnd() * 0.9; tube([bx, 0, bz], [bx + (rnd() - 0.5) * 0.15, h, bz + (rnd() - 0.5) * 0.15], 0.018, BAMBOO, g, 6); for (let k = 0; k < 6; k++) leaf(bx, h * (0.55 + k * 0.08), bz, 0.03, 0.22, rnd() * 6.28, 0.2 + rnd() * 0.6, k % 2 ? LEAF : LEAF2, g, 'long'); }
    return g;
  }
  function planterBox(x, z, w, d, ry, p, tall) {
    const g = grp('Bon_Cay', p); g.position.set(x, 0, z); g.rotation.y = ry || 0;
    rbox(w, 0.42, d, 0.02, PBR(T.oldwood, { roughness: 0.8 }), 0, 0.21, 0, g); box(w - 0.06, 0.02, d - 0.06, SOIL, 0, 0.41, 0, g);
    const n = Math.max(3, Math.round(w / 0.22));
    for (let i = 0; i < n; i++) { const px = -w / 2 + (i + 0.5) * w / n; for (let k = 0; k < (tall ? 5 : 4); k++) { const a = rnd() * 6.28, L = (tall ? 0.35 : 0.2) + rnd() * 0.25; leaf(px + (rnd() - 0.5) * 0.06, 0.4, (rnd() - 0.5) * (d - 0.1), 0.08, L, a, 0.3 + rnd() * 0.6, k % 2 ? LEAF : LEAF2, g, tall ? 'long' : undefined); } sph(0.09, k2(i), px, 0.48, 0, g, 8, 6).scale.y = 0.7; }
    return g;
  }
  const k2 = i => (i % 2 ? LEAF2 : LEAF);
  function stringLights(a, b, n, sag, p) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), pts = [];
    for (let i = 0; i <= n; i++) { const t = i / n; const q = A.clone().lerp(B, t); q.y -= Math.sin(Math.PI * t) * sag; pts.push(q); }
    for (let i = 0; i < n; i++) tube(pts[i].toArray(), pts[i + 1].toArray(), 0.003, BLACK, p, 3);
    for (let i = 1; i < n; i += 1) sph(0.025, WARM, pts[i].x, pts[i].y - 0.04, pts[i].z, p, 8, 6);
  }

  // ---- ô cửa mới: phòng sau -> phòng lớn, phòng sau -> sân vườn ----
  box(2.1, H, 0.2, mBack, -2.55, H / 2, -6.1, walls); box(0.3, H, 0.2, mBack, -0.55, H / 2, -6.1, walls); box(0.8, H - 2.3, 0.2, mBack, -1.1, 2.3 + (H - 2.3) / 2, -6.1, walls);
  box(0.2, H, 1.2, mBack, -0.5, H / 2, -5.5, walls); box(0.2, H, 1.1, mBack, -0.5, H / 2, -3.55, walls); box(0.2, H - 2.3, 0.8, mBack, -0.5, 2.3 + (H - 2.3) / 2, -4.5, walls);
  [-4.9, -4.1].forEach(z => box(0.08, 2.3, 0.06, BLACK, -0.5, 1.15, z, glass)); box(0.08, 0.06, 0.8, BLACK, -0.5, 2.3, -4.5, glass);
  plane(0.8, 2.3, mGlass, -0.42, 1.15, -4.5, Math.PI / 2, glass, 'Cua_Ra_San');

  // ---- SÂN VƯỜN (x -0.4..3.6, z -6.2..-3.2), không mái ----
  const yard = grp('San_Vuon');
  const yf = box(4.0, 0.04, 3.0, mPavers, 1.6, 0.0, -4.7, yard, 'San_Gach'); 
  box(1.2, 0.05, 2.6, GRASS, 2.9, 0.01, -4.7, yard);
  [[0.4, -5.6], [0.9, -5.75], [1.5, -5.55]].forEach(([x, z]) => { const st = cyl(0.18, 0.2, 0.03, M(0xb9b4aa, { roughness: 0.9 }), x, 0.035, z, yard, 10); st.scale.z = 0.7; });
  // hàng rào gỗ phía hẻm + cổng
  const fence = grp('Hang_Rao', yard);
  box(0.25, 0.45, 3.0, mWall, 3.62, 0.225, -4.7, fence);
  for (let z = -6.1; z <= -3.25; z += 0.11) { if (z > -4.65 && z < -3.85) continue; box(0.03, 1.4, 0.08, PBR(T.oldwood), 3.62, 1.15, z, fence); }
  box(0.05, 0.06, 3.0, WOOD, 3.62, 1.82, -4.7, fence); box(0.05, 0.06, 3.0, WOOD, 3.62, 0.95, -4.7, fence);
  for (let z = -4.6; z < -3.9; z += 0.1) box(0.025, 1.1, 0.06, PBR(T.oldwood), 3.66, 0.6, z, fence);
  // giàn gỗ + đèn dây
  const perg = grp('Gian_Go', yard);
  [[-0.25, -3.35], [3.4, -3.35], [-0.25, -6.0], [3.4, -6.0]].forEach(([x, z]) => box(0.1, 2.75, 0.1, WOOD, x, 1.375, z, perg));
  [-3.35, -6.0].forEach(z => box(3.8, 0.12, 0.08, WOOD, 1.58, 2.75, z, perg));
  for (let x = -0.15; x < 3.45; x += 0.42) box(0.06, 0.08, 2.9, WOOD, x, 2.85, -4.68, perg);
  stringLights([-0.2, 2.7, -3.4], [3.35, 2.7, -6.0], 14, 0.35, perg); stringLights([3.35, 2.7, -3.4], [-0.2, 2.7, -6.0], 14, 0.35, perg); stringLights([-0.2, 2.7, -4.7], [3.35, 2.7, -4.7], 12, 0.3, perg);
  [[1.6, 2.2, -4.7, 0.9], [0.5, 2.2, -4.0, 0.6], [2.6, 2.2, -5.4, 0.6]].forEach(([x, y, z, i]) => { const l = new THREE.PointLight(0xffc27a, i, 5, 2); l.position.set(x, y, z); lights.add(l); });
  for (let i = 0; i < 6; i++) vine(0.2 + i * 0.6, 2.82, -3.4 - rnd() * 0.1, 0.5 + rnd() * 0.7, perg);
  for (let i = 0; i < 6; i++) vine(0.2 + i * 0.6, 2.82, -5.95, 0.5 + rnd() * 0.7, perg);
  tree(2.9, -4.2, 2.4, 1.0, yard);
  bambooClump(3.25, -5.7, 9, yard); bambooClump(3.25, -3.6, 7, yard);
  pottedPlant(-0.1, -5.9, 1.3, yard, M(0x5a4636), 'big');
  planterBox(1.6, -6.0, 1.4, 0.35, 0, yard, true);
  // bàn sân vườn
  [['Ban_12', 0.75, -4.35, 'Bàn 12 – sân vườn, gần cửa'], ['Ban_13', 1.25, -5.5, 'Bàn 13 – sân vườn, dưới giàn đèn'], ['Ban_14', 2.1, -4.05, 'Bàn 14 – sân vườn, cạnh cây lớn']].forEach(([n, x, z, lb]) => {
    const g = grp(n, yard);
    cyl(0.32, 0.32, 0.04, PBR(T.oldwood, { roughness: 0.7 }), x, 0.72, z, g, 24); cyl(0.03, 0.03, 0.7, BLACK, x, 0.36, z, g, 8); cyl(0.2, 0.22, 0.03, BLACK, x, 0.015, z, g, 18);
    slatChair(x, z + 0.55, Math.PI, yard); if (n === 'Ban_13') slatChair(x - 0.5, z - 0.1, Math.PI / 2 - 0.2, yard);
    cup(x + 0.08, 0.74, z - 0.05, yard, n === 'Ban_13' ? 'glass' : undefined);
    seatAt(n, x, z + 0.62, x, 0.78, z - 0.2, lb);
  });

  // ---- PHÒNG LÀM VIỆC LỚN (x -3.6..3.6, z -13..-6.2) ----
  const hall = grp('Phong_Lon');
  const HZ0 = -6.2, HZ1 = -13.0, HC = (HZ0 + HZ1) / 2, HL = HZ0 - HZ1;
  const hf = plane(7.2, HL, mFloor, 0, 0, HC, 0, hall, 'San_Phong_Lon'); hf.rotation.x = -Math.PI / 2;
  box(0.2, H, HL, mWhite, -3.6, H / 2, HC, walls);
  box(7.4, H, 0.2, mWall, 0, H / 2, HZ1 - 0.1, walls);
  // tường trước phòng lớn (giáp sân vườn): kính lớn x 0.4..3.0
  box(0.8, H, 0.2, mWall, 0.0, H / 2, -6.3, walls); box(0.6, H, 0.2, mWall, 3.3, H / 2, -6.3, walls); box(2.6, H - 2.6, 0.2, mWall, 1.7, 2.6 + (H - 2.6) / 2, -6.3, walls);
  plane(2.6, 2.6, mGlass, 1.7, 1.3, -6.22, 0, glass, 'Kinh_Phong_Lon'); [0.4, 1.7, 3.0].forEach(x => box(0.06, 2.6, 0.08, BLACK, x, 1.3, -6.25, glass)); box(2.66, 0.06, 0.08, BLACK, 1.7, 2.6, -6.25, glass);
  // tường phải: 2 cửa sổ lớn nhìn ra hẻm
  const winZ = [[-9.35, -7.0], [-11.95, -9.6]];
  box(0.2, H, 0.8, mWall, 3.6, H / 2, -6.6, walls); box(0.2, H, 0.25, mWall, 3.6, H / 2, -9.475, walls); box(0.2, H, 1.05, mWall, 3.6, H / 2, -12.475, walls);
  winZ.forEach(([a, b]) => { const c = (a + b) / 2, L = b - a; box(0.2, 0.8, L, mWall, 3.6, 0.4, c, walls); box(0.2, H - 2.5, L, mWall, 3.6, 2.5 + (H - 2.5) / 2, c, walls); plane(L, 1.7, mGlass, 3.62, 1.65, c, Math.PI / 2, glass); [a, c, b].forEach(z => box(0.08, 1.7, 0.06, BLACK, 3.58, 1.65, z, glass)); box(0.08, 0.06, L, BLACK, 3.58, 2.5, c, glass); box(0.08, 0.06, L, BLACK, 3.58, 0.8, c, glass); });
  // mặt ngoài đá granite phía hẻm
  [[-6.6, 0.8], [-9.475, 0.25], [-12.475, 1.05]].forEach(([c, L]) => box(0.04, H, L, mGranite, 3.72, H / 2, c, facade));
  winZ.forEach(([a, b]) => { const c = (a + b) / 2, L = b - a; box(0.04, 0.8, Math.abs(L), M(0xffffff, { map: canv.lattice }), 3.72, 0.4, c, facade); box(0.04, H - 2.5, Math.abs(L), mGranite, 3.72, 2.5 + (H - 2.5) / 2, c, facade); });
  box(0.08, 0.12, 7.0, BLACK, 3.72, H + 0.06, -9.6, facade);
  const hceil = box(7.4, 0.04, HL + 0.2, mCeil, 0, H + 0.02, HC, root, 'Tran_Phong_Lon');
  tube([-3.45, 3.16, -6.4], [-3.45, 3.16, -12.9], 0.016, PIPE, pipes); tube([3.45, 3.1, -6.4], [3.45, 3.1, -12.9], 0.016, PIPE, pipes);
  box(7.0, 0.1, 0.02, DARK, 0, 0.05, HZ1 + 0.01, walls);

  // bàn dài dùng chung: 6 chỗ (3 mỗi bên)
  const comm = grp('Ban_Dai', hall);
  const CZ = [-8.0, -8.95, -9.9];
  CZ.forEach((z, i) => {
    [[-1, 'trái'], [1, 'phải']].forEach(([sd, sn], j) => {
      const n = 'Ban_' + (15 + i * 2 + j), g = grp(n, comm);
      rbox(0.48, 0.05, 0.93, 0.008, mOld, -0.6 + sd * 0.245, 0.745, z, g);
      if (j === 0) { box(0.04, 0.72, 0.04, BLACK, -0.6, 0.36, z - 0.4, g); }
      const cx = -0.6 + sd * 0.85; slatChair(cx, z, sd < 0 ? Math.PI / 2 : -Math.PI / 2, comm);
      seatAt(n, cx - sd * 0.05, z, -0.6 - sd * 0.15, 0.82, z, 'Bàn ' + (15 + i * 2 + j) + ' – bàn dài, dãy ' + sn);
    });
  });
  cup(-0.75, 0.77, -8.4, comm, 'glass'); cup(-0.45, 0.77, -9.5, comm);
  rbox(0.18, 0.015, 0.24, 0.003, M(0x8a3b2b), -0.4, 0.78, -8.9, comm).rotation.y = 0.4;
  [-8.0, -8.95, -9.9].forEach(z => pendant(-0.6, z, 2.45, comm));

  // dãy bàn cá nhân sát cửa sổ (phải)
  const winDesks = [-7.55, -8.65, -10.15, -11.25];
  winDesks.forEach((z, i) => {
    const n = 'Ban_' + (21 + i), g = grp(n, hall);
    rbox(0.5, 0.045, 0.95, 0.008, mOld, 3.25, 0.75, z, g); box(0.03, 0.73, 0.03, BLACK, 3.05, 0.365, z - 0.42, g); box(0.03, 0.73, 0.03, BLACK, 3.05, 0.365, z + 0.42, g);
    greenChair(2.7, z, Math.PI / 2, hall, 0.48);
    const lp = grp('Den_Ban', hall); cyl(0.06, 0.065, 0.015, STEEL, 3.35, 0.78, z + 0.32, lp, 16); tube([3.35, 0.78, z + 0.32], [3.3, 1.15, z + 0.3], 0.006, STEEL, lp, 6); const c2 = new THREE.Mesh(domeGeo(0.07, 0.1), M(0x2f5a44, { side: THREE.DoubleSide, roughness: 0.4 })); c2.position.set(3.24, 1.17, z + 0.28); c2.rotation.z = 0.7; lp.add(c2); sph(0.022, WARM, 3.21, 1.13, z + 0.28, lp);
    pottedPlant(3.38, z - 0.33, 0.45, hall);
    seatAt(n, 2.62, z, 3.5, 0.9, z, 'Bàn ' + (21 + i) + ' – bàn cá nhân sát cửa sổ');
  });
  [-8.1, -9.4, -10.7].forEach(z => box(0.5, 1.15, 0.03, PBR(T.planks), 3.25, 1.0, z, hall));

  // dãy bàn sát tường trái, có kệ trên đầu
  [-7.4, -8.55, -9.7].forEach((z, i) => {
    const n = 'Ban_' + (25 + i), g = grp(n, hall);
    rbox(0.5, 0.045, 0.95, 0.008, mOld, -3.25, 0.75, z, g); box(0.03, 0.73, 0.03, BLACK, -3.05, 0.365, z - 0.42, g); box(0.03, 0.73, 0.03, BLACK, -3.05, 0.365, z + 0.42, g);
    slatChair(-2.75, z, -Math.PI / 2, hall);
    rbox(0.3, 0.025, 0.95, 0.005, WOOD, -3.35, 1.55, z, hall); jars(0, 0, 0, 0, hall);
    const bk = plane(0.9, 0.18, M(0xffffff, { map: canv.books }), -3.42, 1.655, z, Math.PI / 2, hall); bk.name = 'Sach';
    seatAt(n, -2.68, z, -3.5, 0.95, z, 'Bàn ' + (25 + i) + ' – bàn sát tường, có kệ sách');
  });
  [-7.95, -9.1].forEach(z => box(0.5, 1.15, 0.03, PBR(T.planks), -3.25, 1.0, z, hall));
  cup(-3.2, 0.77, -8.4, hall); hangPlant(-2.9, 2.4, -7.9, hall); hangPlant(-2.9, 2.4, -9.6, hall);

  // góc sofa + kệ sách lớn
  const lounge = grp('Goc_Sofa', hall);
  box(2.6, 0.012, 2.0, M(0xffffff, { map: canv.rug }), -1.9, 0.006, -11.9, lounge);
  rbox(2.3, 0.18, 0.7, 0.06, mLeather, -2.2, 0.3, -12.55, lounge); rbox(2.3, 0.5, 0.18, 0.07, mLeather, -2.2, 0.62, -12.85, lounge);
  rbox(0.7, 0.18, 1.3, 0.06, mLeather, -3.1, 0.3, -11.6, lounge); rbox(0.18, 0.5, 1.3, 0.07, mLeather, -3.4, 0.62, -11.6, lounge);
  box(2.4, 0.2, 0.75, M(0x3a2a1e), -2.2, 0.1, -12.55, lounge); box(0.75, 0.2, 1.3, M(0x3a2a1e), -3.1, 0.1, -11.6, lounge);
  const lt = grp('Ban_28', hall); rbox(0.9, 0.05, 0.55, 0.015, mOld, -1.9, 0.42, -11.55, lt); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(0.035, 0.4, 0.035, BLACK, -1.9 + a * 0.38, 0.2, -11.55 + b * 0.22, lt));
  cup(-1.75, 0.445, -11.5, lounge); cup(-2.05, 0.445, -11.65, lounge, 'glass');
  seatAt('Ban_28', -2.0, -12.5, -1.9, 0.55, -11.4, 'Bàn 28 – góc sofa');
  [-1.0, -2.6].forEach(x => { const g = grp('Den_Cay', lounge); cyl(0.13, 0.15, 0.03, BLACK, x === -1.0 ? -0.85 : -3.3, 0.015, -12.75, g, 16); });
  const fl4 = grp('Den_Cay', lounge); tube([-0.85, 0, -12.75], [-0.85, 1.5, -12.75], 0.015, BLACK, fl4, 8); const sh4 = cyl(0.12, 0.2, 0.25, M(0xf2e6cc, { emissive: 0xffd9a0, emissiveIntensity: 0.6, side: THREE.DoubleSide }), -0.85, 1.6, -12.75, fl4, 20);
  const ll2 = new THREE.PointLight(0xffc27a, 0.8, 4, 2); ll2.position.set(-0.85, 1.5, -12.6); lights.add(ll2);
  pendant(-2.2, -11.9, 2.5, lounge, true);
  // kệ sách lớn trên tường sau
  const shelf = grp('Ke_Sach_Lon', hall);
  for (let r = 0; r < 5; r++) { rbox(3.6, 0.03, 0.3, 0.005, WOOD, 1.7, 0.35 + r * 0.45, -12.85, shelf); plane(3.5, 0.32, M(0xffffff, { map: canv.books }), 1.7, 0.35 + r * 0.45 + 0.17, -12.93, 0, shelf).name = 'Sach'; }
  [-0.1, 1.7, 3.5].forEach(x => box(0.04, 2.3, 0.32, WOOD, x, 1.15, -12.85, shelf));
  tube([0.9, 0, -12.45], [1.0, 2.3, -12.75], 0.02, WOOD, shelf, 6); tube([1.3, 0, -12.45], [1.4, 2.3, -12.75], 0.02, WOOD, shelf, 6); for (let k = 0; k < 7; k++) { const t = k / 7; tube([0.9 + t * 0.1, t * 2.3, -12.45 - t * 0.3], [1.3 + t * 0.1, t * 2.3, -12.45 - t * 0.3], 0.012, WOOD, shelf, 5); }
  // cây xanh trong phòng lớn
  pottedPlant(2.9, -12.4, 1.5, hall, M(0x5a4636), 'big');
  planterBox(-0.6, -11.2, 1.0, 0.3, 0, hall);
  hangPlant(1.2, 2.5, -7.3, hall); hangPlant(1.9, 2.5, -10.9, hall); hangPlant(-1.4, 2.5, -10.6, hall);
  floorFan(3.25, -6.65, Math.PI * 0.75, hall);
  rbox(0.25, 0.3, 0.9, 0.04, M(0xf1f1ee, { roughness: 0.4 }), -3.37, 2.95, -9.6, hall, 'May_Lanh');
  [1.9, 0.6].forEach((x, i) => { const g = grp('Dong_Ho', hall); const c = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 28), [M(0x8f9396, { metalness: 0.7 }), M(0xffffff, { map: canv.clock }), M(0x8f9396)], x + 0.3 * i, 2.85, -12.97, g); c.rotation.x = Math.PI / 2; });
  pendant(1.6, -9.0, 2.6, hall, true); pendant(2.6, -11.3, 2.6, hall);
  mesh(new THREE.IcosahedronGeometry(0.15, 2), DISCO, 1.2, 2.85, -11.9, hall, 'Qua_Cau_Disco'); tube([1.2, H, -11.9], [1.2, 3.0, -11.9], 0.004, BLACK, hall, 4);

  // ---- cây xanh xung quanh bên ngoài ----
  const green = grp('Cay_Xanh_Ngoai');
  [[5.35, 2.2], [5.35, -2.6], [5.35, -7.0], [5.35, -11.0]].forEach(([x, z], i) => { cyl(0.45, 0.45, 0.06, SOIL, x, 0.07, z, green, 16); tree(x, z, 2.4 + (i % 2) * 0.4, 0.85, green); });
  [[-2.2, 5.3], [1.8, 5.3]].forEach(([x, z]) => { cyl(0.45, 0.45, 0.06, SOIL, x, 0.07, z, green, 16); tree(x, z, 2.3, 0.8, green); });
  planterBox(-2.6, 3.42, 1.4, 0.3, 0, green); planterBox(3.95, -7.2, 1.3, 0.3, Math.PI / 2, green, true); planterBox(3.95, -11.6, 1.3, 0.3, Math.PI / 2, green, true); planterBox(3.95, -9.2, 0.9, 0.3, Math.PI / 2, green);
  for (let i = 0; i < 10; i++) vine(3.78, 3.25, -7.0 - rnd() * 5.5, 0.4 + rnd() * 1.0, green);
  pottedPlant(4.2, 1.9, 1.1, green, null, 'big');
  pottedPlant(-3.3, -6.6, 0.9, hall); // chậu ở ô cửa vào phòng lớn đã bỏ

  root.updateMatrixWorld(true);
  const dbgMap = new Map();
  root.traverse(o => { if (!o.isMesh) return; let a = o; while (a && !a.name && a.parent) a = a.parent; if (!a.name) return;
    const b = new THREE.Box3().setFromObject(o); if (b.min.y > 1.1 || b.max.y < 0.04) return;
    const path = []; for (let p = a; p && p !== root; p = p.parent) if (p.name) path.push(p.name);
    const k = a.uuid; if (!dbgMap.has(k)) dbgMap.set(k, { n: path.slice(0, 3).join('<'), b: b.clone() }); else dbgMap.get(k).b.union(b); });
  const dbg = [...dbgMap.values()].map(d => ({ n: d.n, b: [-d.b.max.x, d.b.min.y, d.b.min.z, -d.b.min.x, d.b.max.y, d.b.max.z].map(v => +v.toFixed(3)) }));
  // ---------------- gộp khối theo vật liệu (giảm draw call) ----------------
  const keep = o => { for (let p = o; p && p !== root; p = p.parent) if (/^Ban_\d+$/.test(p.name)) return true; return /^Tran/.test(o.name) || ['Bien_Hieu', 'Hop_Den'].includes(o.name); };
  root.updateMatrixWorld(true);
  const buckets = new Map(), toRemove = [];
  root.traverse(o => {
    if (!o.isMesh || keep(o) || Array.isArray(o.material) || o.material.transparent) return;
    const k = o.material.uuid; if (!buckets.has(k)) buckets.set(k, { mat: o.material, items: [] });
    buckets.get(k).items.push(o); toRemove.push(o);
  });
  const merged = grp('Khoi_Gop');
  buckets.forEach(({ mat, items }) => {
    let vCount = 0, iCount = 0; const parts = [];
    items.forEach(o => {
      let g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.index) g = weld(g);
      const n = g.attributes.position.count; const idx = Array.from(g.index.array);
      parts.push({ g, idx }); vCount += n; iCount += idx.length;
    });
    const P = new Float32Array(vCount * 3), N = new Float32Array(vCount * 3), U = new Float32Array(vCount * 2), I = new Uint32Array(iCount);
    let vo = 0, io = 0;
    parts.forEach(({ g, idx }) => {
      const n = g.attributes.position.count;
      P.set(g.attributes.position.array.subarray ? g.attributes.position.array.slice(0, n * 3) : g.attributes.position.array, vo * 3);
      N.set(g.attributes.normal.array.slice(0, n * 3), vo * 3);
      if (g.attributes.uv) U.set(g.attributes.uv.array.slice(0, n * 2), vo * 2);
      for (let i = 0; i < idx.length; i++) I[io + i] = idx[i] + vo;
      vo += n; io += idx.length;
    });
    const mg = new THREE.BufferGeometry();
    mg.setAttribute('position', new THREE.BufferAttribute(P, 3)); mg.setAttribute('normal', new THREE.BufferAttribute(N, 3)); mg.setAttribute('uv', new THREE.BufferAttribute(U, 2));
    mg.setIndex(new THREE.BufferAttribute(I, 1));
    const m = new THREE.Mesh(mg, mat); merged.add(m);
  });
  toRemove.forEach(o => o.parent.remove(o));
  const prune = g => { g.children.slice().forEach(prune); if (!g.isMesh && g.children.length === 0 && g !== root && !/^Ban_\d+$/.test(g.name) && g.parent) g.parent.remove(g); };
  prune(root);

  // ánh sáng tổng (chỉ dùng khi xem thử)
  const hemi = new THREE.HemisphereLight(0xffe9cc, 0x4a4038, 0.45); lights.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4e0, 0.6); sun.position.set(6, 9, 7); lights.add(sun);

  root.scale.x = -1; lights.scale.x = -1;
  seats.forEach(s => { s.cam[0] *= -1; s.look[0] *= -1; });
  return { root, lights, seats, ceiling: ceil, dbg };
}
if (typeof module !== 'undefined') module.exports = { buildCafe };
