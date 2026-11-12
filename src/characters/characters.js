// Chilly Coffee — bộ nhân vật chibi. buildCharacter(THREE, spec) -> { root, clips }.
// Khung xương bằng nhóm (node) có tên: <id>_Than, <id>_Dau, <id>_Tay_Trai, <id>_Tay_Phai, <id>_Chan_Trai, <id>_Chan_Phai.
// Mỗi bộ phận gộp thành 1 khối dùng màu đỉnh (vertex color) để nhẹ: ~7 draw call / nhân vật.
// Tỷ lệ so với đồ đạc trong quán: 0.65 => cao khoảng 1,07 m.
const CHAR_SCALE = 0.65;
const CHAR_PRESETS = [
  { id: 'guest_hoodie', ten: 'Khách – hoodie', hair: 'short', hc: 0x2c211b, top: 0x5dcaa5, pants: 0x444441, shoe: 0xf1efe8, outfit: 'hoodie', skin: 0xf0be96 },
  { id: 'guest_cardigan', ten: 'Khách – cardigan', hair: 'bun', hc: 0x1f1a17, top: 0xf5c4b3, pants: 0x85b7eb, shoe: 0xf1efe8, outfit: 'cardigan', skin: 0xf3c9a4 },
  { id: 'guest_overalls', ten: 'Khách – quần yếm', hair: 'pony', hc: 0x6b3e26, top: 0xfac775, pants: 0x185fa5, shoe: 0xe24b4a, outfit: 'overalls', skin: 0xe8b08a },
  { id: 'guest_sweater', ten: 'Khách – áo len, khăn', hair: 'bob', hc: 0x4a2c1e, top: 0xafa9ec, pants: 0x5f5e5a, shoe: 0xf1efe8, outfit: 'sweater', skin: 0xf0be96 },
  { id: 'guest_glasses', ten: 'Khách – đeo kính', hair: 'curly', hc: 0x3b2a20, top: 0xf8f5ee, pants: 0x2c2c2a, shoe: 0x5f5e5a, outfit: 'shirt', acc: ['glasses'], skin: 0xd9a27a },
  { id: 'guest_headphones', ten: 'Khách – tai nghe', hair: 'twin', hc: 0x2a1c16, top: 0xed93b1, pants: 0x3c3489, shoe: 0xffffff, outfit: 'tee', acc: ['headphones'], skin: 0xf3c9a4 },
  { id: 'barista_1', ten: 'Barista – mũ lưỡi trai', hair: 'short', hc: 0x1f1a17, top: 0xf2ede1, pants: 0x2c2c2a, shoe: 0x2c2c2a, outfit: 'apron', acc: ['cap', 'tag'], skin: 0xe8b08a },
  { id: 'barista_2', ten: 'Barista – tóc đuôi ngựa', hair: 'pony', hc: 0x3b2a20, top: 0x2c2c2a, pants: 0x2c2c2a, shoe: 0x2c2c2a, outfit: 'apron', acc: ['tag'], skin: 0xf0be96 },
  { id: 'passerby_backpack', ten: 'Người đi đường – sinh viên balo', hair: 'short', hc: 0x2c211b, top: 0x378add, pants: 0x444441, shoe: 0xf1efe8, outfit: 'tee', acc: ['backpack'], skin: 0xe8b08a },
  { id: 'passerby_office', ten: 'Người đi đường – công sở', hair: 'buzz', hc: 0x1f1a17, top: 0xffffff, pants: 0x2c2c3a, shoe: 0x1f1a17, outfit: 'shirt', acc: ['tie', 'bag'], skin: 0xd9a27a },
  { id: 'passerby_umbrella', ten: 'Người đi đường – cầm ô', hair: 'bob', hc: 0x1f1a17, top: 0xd85a30, pants: 0x444441, shoe: 0x5f5e5a, outfit: 'coat', acc: ['umbrella'], skin: 0xf3c9a4 },
  { id: 'passerby_jogger', ten: 'Người đi đường – chạy bộ', hair: 'short', hc: 0x4a2c1e, top: 0x97c459, pants: 0x2c2c2a, shoe: 0xe24b4a, outfit: 'tee', pantsKind: 'shorts', acc: ['cap'], skin: 0xd9a27a }
];

function buildCharacter(THREE, spec) {
  const id = spec.id;
  const root = new THREE.Group(); root.name = id;
  const frame = new THREE.Group(); frame.name = id + '_Khung'; frame.scale.setScalar(spec.scale || CHAR_SCALE); root.add(frame);
  const body = new THREE.Group(); body.name = id + '_Than'; frame.add(body);
  const head = new THREE.Group(); head.name = id + '_Dau'; head.position.set(0, 0.85, 0); body.add(head);
  const mk = (name, parent, x, y, z) => { const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); return g; };
  const armBase = [-1, 1].map(s => { const o = mk(id + (s < 0 ? '_Vai_Trai' : '_Vai_Phai'), body, s * 0.24, 0.8, 0); o.rotation.z = s * 0.14; return o; });
  const armL = mk(id + '_Tay_Trai', armBase[0], 0, 0, 0), armR = mk(id + '_Tay_Phai', armBase[1], 0, 0, 0);
  const legL = mk(id + '_Chan_Trai', body, -0.11, 0.4, 0), legR = mk(id + '_Chan_Phai', body, 0.11, 0.4, 0);
  const parts = { body, head, armL, armR, legL, legR };
  // khối tạm, gộp sau
  const add = (part, geo, color, x, y, z, rx, ry, rz, sx, sy, sz) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color })); m.position.set(x || 0, y || 0, z || 0);
    m.rotation.set(rx || 0, ry || 0, rz || 0); if (sx) m.scale.set(sx, sy, sz); parts[part].add(m); m.userData.tmp = true; return m;
  };
  const C = (rt, rb, h, seg, open) => new THREE.CylinderGeometry(rt, rb, h, seg || 16, 1, !!open);
  const S = (r, w, h, ts, tl, ps, pl) => new THREE.SphereGeometry(r, w || 20, h || 14, ps || 0, pl || Math.PI * 2, ts || 0, tl || Math.PI);
  const Cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 10);
  const Tor = (r, t, arc) => new THREE.TorusGeometry(r, t, 6, 16, arc || Math.PI * 2);
  const Bx = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const fz = y => 0.26 - (y - 0.41) / 0.42 * 0.06 + 0.012;
  const sk = spec.skin || 0xf0be96, top = spec.top, pants = spec.pants, INK = 0x2c211b;
  const shortsMode = spec.pantsKind === 'shorts';

  // thân
  add('body', C(0.2, 0.26, 0.42, 20), spec.outfit === 'coat' ? top : top, 0, 0.62, 0);
  add('body', C(0.255, 0.24, 0.08, 20), pants, 0, 0.4, 0);
  add('body', C(0.07, 0.08, 0.08, 12), sk, 0, 0.86, 0);
  // chân (gốc ở hông)
  [legL, legR].forEach((lg, i) => {
    const p = i ? 'legR' : 'legL';
    if (shortsMode) { add(p, C(0.105, 0.1, 0.12, 12), pants, 0, -0.05, 0); add(p, C(0.075, 0.07, 0.2, 12), sk, 0, -0.2, 0); }
    else add(p, C(0.1, 0.095, 0.3, 12), pants, 0, -0.16, 0);
    add(p, S(0.1, 12, 8), spec.shoe, 0, -0.33, 0.03, 0, 0, 0, 1.1, 0.7, 1.4);
  });
  // tay
  [armL, armR].forEach((a, i) => { const p = i ? 'armR' : 'armL'; add(p, Cap(0.075, 0.2), spec.outfit === 'tee' ? sk : top, 0, -0.15, 0); if (spec.outfit === 'tee') add(p, C(0.085, 0.08, 0.1, 12), top, 0, -0.05, 0); add(p, S(0.072, 12, 8), sk, 0, -0.32, 0); });
  // đầu (gốc ở cổ, tâm đầu cao hơn 0.35)
  const HY = 0.35;
  add('head', S(0.42, 28, 20), sk, 0, HY, 0, 0, 0, 0, 1, 0.97, 1);
  [-1, 1].forEach(s => {
    add('head', Tor(0.042, 0.011, Math.PI), INK, s * 0.13, HY + 0.015, 0.398, 0, s * 0.32, 0);
    add('head', new THREE.CircleGeometry(0.05, 14), 0xf09595, s * 0.2, HY - 0.07, 0.368, 0, s * 0.5, 0);
    add('head', S(0.06, 10, 8), sk, s * 0.41, HY - 0.02, 0, 0, 0, 0, 0.5, 1, 0.8);
  });
  add('head', Tor(0.04, 0.01, Math.PI), INK, 0, HY - 0.09, 0.41, 0, 0, Math.PI);
  // tóc
  const hc = spec.hc;
  const cap = (th, rx, r) => add('head', S(r || 0.445, 28, 16, 0, th), hc, 0, HY, 0, rx, 0, 0);
  const hairs = {
    short: () => cap(1.32, -0.3),
    buzz: () => cap(1.18, -0.38, 0.432),
    bun: () => { cap(1.3, -0.3); add('head', S(0.17, 14, 10), hc, 0, HY + 0.43, -0.16); },
    pony: () => { cap(1.3, -0.3); add('head', S(0.06, 10, 8), 0xe24b4a, 0, HY + 0.16, -0.42); add('head', Cap(0.085, 0.32), hc, 0, HY - 0.08, -0.5, 0.35, 0, 0); },
    curly: () => { cap(1.2, -0.3, 0.44); for (let i = 0; i < 40; i++) { const th = 0.15 + (i % 5) * 0.3, ph = i * 2.4; const p = new THREE.Vector3(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)).multiplyScalar(0.45); p.applyAxisAngle(new THREE.Vector3(1, 0, 0), -0.3); if (p.z > 0.2 && p.y < 0.3) continue; add('head', S(0.115, 8, 6), hc, p.x, p.y + HY, p.z); } },
    bob: () => { add('head', new THREE.SphereGeometry(0.455, 28, 16, Math.PI / 2 + 0.85, Math.PI * 2 - 1.7, 0, 2.0), hc, 0, HY, 0); cap(1.22, -0.12, 0.448); },
    twin: () => { cap(1.3, -0.22); [-1, 1].forEach(s => { add('head', S(0.05, 8, 6), 0xed93b1, s * 0.36, HY - 0.05, -0.12); add('head', Cap(0.07, 0.3), hc, s * 0.4, HY - 0.3, -0.14, 0, 0, s * 0.1); }); }
  };
  (hairs[spec.hair] || hairs.short)();
  // trang phục
  const fits = {
    hoodie: () => { add('body', Tor(0.19, 0.075), top, 0, 0.86, -0.1, Math.PI / 2 + 0.3); add('body', Bx(0.26, 0.1, 0.02), shade(top, 0.8), 0, 0.52, fz(0.52), -0.14); [-0.05, 0.05].forEach(x => add('body', C(0.008, 0.008, 0.12, 6), 0xffffff, x, 0.72, fz(0.72))); },
    cardigan: () => { add('body', Bx(0.09, 0.42, 0.02), 0xf8f5ee, 0, 0.62, fz(0.62) - 0.004, -0.14); [0.5, 0.6, 0.7].forEach(y => add('body', S(0.016, 8, 6), 0x633806, 0.06, y, fz(y) + 0.004)); },
    overalls: () => { add('body', Bx(0.26, 0.22, 0.03), pants, 0, 0.53, fz(0.53), -0.14); [-0.09, 0.09].forEach(x => { add('body', Bx(0.045, 0.2, 0.02), pants, x, 0.73, fz(0.73)); add('body', S(0.018, 8, 6), 0xef9f27, x, 0.64, fz(0.64) + 0.02); }); },
    apron: () => { add('body', Bx(0.4, 0.52, 0.02), 0x7a4a2a, 0, 0.46, 0.262, -0.1); add('body', Bx(0.16, 0.08, 0.02), 0x9c6a44, 0, 0.44, 0.28); add('body', Bx(0.26, 0.03, 0.02), 0x7a4a2a, 0, 0.75, fz(0.75)); [-1, 1].forEach(s => add('body', Bx(0.03, 0.2, 0.02), 0x7a4a2a, s * 0.1, 0.8, fz(0.8) - 0.01, 0, 0, s * 0.3)); },
    sweater: () => { [0.5, 0.62, 0.74].forEach(y => { const r = 0.26 - (y - 0.41) / 0.42 * 0.06 + 0.006; add('body', C(r, r + 0.004, 0.045, 20, true), 0xf8f5ee, 0, y, 0); }); add('body', Tor(0.2, 0.065), 0xd85a30, 0, 0.85, 0, Math.PI / 2); add('body', Bx(0.09, 0.26, 0.05), 0xd85a30, 0.1, 0.7, 0.24, 0, 0, 0.1); },
    shirt: () => { [-1, 1].forEach(s => add('body', Bx(0.08, 0.06, 0.02), shade(top, 0.92), s * 0.06, 0.82, fz(0.82), -0.14, 0, s * 0.5)); [0.5, 0.6, 0.7].forEach(y => add('body', S(0.012, 6, 4), 0x9a9a9a, 0, y, fz(y) + 0.003)); },
    tee: () => { add('body', Tor(0.12, 0.015), shade(top, 0.85), 0, 0.83, 0, Math.PI / 2); },
    coat: () => { add('body', C(0.27, 0.32, 0.34, 20), top, 0, 0.36, 0); add('body', Bx(0.03, 0.62, 0.02), shade(top, 0.75), 0, 0.5, fz(0.5) + 0.02, -0.14); add('body', Tor(0.17, 0.05), top, 0, 0.84, 0, Math.PI / 2); }
  };
  (fits[spec.outfit] || fits.tee)();
  // phụ kiện
  (spec.acc || []).forEach(a => {
    if (a === 'glasses') { [-1, 1].forEach(s => add('head', Tor(0.075, 0.012), 0x1f1a17, s * 0.13, HY + 0.02, 0.41)); add('head', Bx(0.07, 0.014, 0.014), 0x1f1a17, 0, HY + 0.03, 0.415); }
    if (a === 'headphones') { add('head', Tor(0.44, 0.03, Math.PI), 0x2c2c2a, 0, HY + 0.02, 0); [-1, 1].forEach(s => add('head', C(0.1, 0.1, 0.08, 16), 0x2c2c2a, s * 0.43, HY, 0, 0, 0, Math.PI / 2)); }
    if (a === 'cap') { add('head', S(0.452, 24, 12, 0, 1.25), spec.id.startsWith('barista') ? 0x7a4a2a : 0x2c2c2a, 0, HY, 0, -0.15); add('head', C(0.24, 0.24, 0.02, 20), spec.id.startsWith('barista') ? 0x7a4a2a : 0x2c2c2a, 0, HY + 0.24, 0.3, 0.25, 0, 0, 1, 1, 0.7); }
    if (a === 'tag') add('body', Bx(0.08, 0.04, 0.01), 0xf2ede1, -0.09, 0.66, 0.272);
    if (a === 'backpack') { const b = add('body', new THREE.CapsuleGeometry(0.17, 0.12, 4, 10), 0xd85a30, 0, 0.62, -0.3); b.scale.set(1, 1, 0.6); [-1, 1].forEach(s => add('body', Bx(0.04, 0.38, 0.02), 0x993c1d, s * 0.11, 0.66, 0.0, 0, 0, 0)); }
    if (a === 'tie') add('body', Bx(0.05, 0.28, 0.015), 0xa32d2d, 0, 0.66, fz(0.66) + 0.008, -0.14);
    if (a === 'bag') { add('armR', Bx(0.24, 0.18, 0.07), 0x3b2a1e, 0, -0.45, 0.02); add('armR', Bx(0.02, 0.1, 0.02), 0x3b2a1e, 0, -0.35, 0.02); }
    if (a === 'umbrella') { armBase[0].rotation.x = -0.75; add('body', C(0.012, 0.012, 1.1, 6), 0x2c2c2a, -0.3, 1.2, 0.2); add('body', new THREE.ConeGeometry(0.62, 0.25, 12, 1, true), 0x378add, -0.3, 1.85, 0.2); add('body', S(0.02, 6, 4), 0x2c2c2a, -0.3, 1.99, 0.2); add('body', Tor(0.04, 0.01, Math.PI), 0x2c2c2a, -0.34, 0.65, 0.2, 0, 0, Math.PI); }
  });
  function shade(c, k) { const col = new THREE.Color(c); col.multiplyScalar(k); return col.getHex(); }

  // gộp mỗi bộ phận thành 1 khối màu đỉnh
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0, name: 'Chibi' });
  Object.entries(parts).forEach(([k, g]) => {
    const kids = g.children.filter(c => c.isMesh && c.userData.tmp); if (!kids.length) return;
    let P = [], N = [], Cc = [], I = [], vo = 0;
    kids.forEach(m => {
      m.updateMatrix(); let geo = m.geometry.clone(); geo.applyMatrix4(m.matrix); if (!geo.index) { const n = geo.attributes.position.count; geo.setIndex([...Array(n).keys()]); }
      const col = m.material.color.clone().convertSRGBToLinear(), n = geo.attributes.position.count;
      for (let i = 0; i < n; i++) { P.push(geo.attributes.position.getX(i), geo.attributes.position.getY(i), geo.attributes.position.getZ(i)); N.push(geo.attributes.normal.getX(i), geo.attributes.normal.getY(i), geo.attributes.normal.getZ(i)); Cc.push(col.r, col.g, col.b); }
      geo.index.array.forEach(ix => I.push(ix + vo)); vo += n; g.remove(m);
    });
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); mg.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); mg.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3)); mg.setIndex(I);
    const mesh = new THREE.Mesh(mg, mat); mesh.name = g.name + '_Khoi'; mesh.castShadow = true; g.add(mesh);
  });

  // ---------- hoạt ảnh ----------
  const q = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y || 0, z || 0)).toArray();
  const qt = (node, times, eulers) => new THREE.QuaternionKeyframeTrack(node + '.quaternion', times, eulers.flatMap(e => q(...e)));
  const pt = (node, times, ys) => new THREE.VectorKeyframeTrack(node + '.position', times, ys.flatMap(y => [0, y, 0]));
  const hp = [0, 0.85, 0];
  const headT = (times, eulers) => qt(id + '_Dau', times, eulers);
  const clips = [];
  // Đứng (idle)
  clips.push(new THREE.AnimationClip('Dung', 3, [
    pt(id + '_Than', [0, 1.5, 3], [0, 0.012, 0]),
    headT([0, 1.5, 3], [[0, 0, 0], [0.03, 0.15, 0], [0, 0, 0]]),
    qt(id + '_Tay_Trai', [0, 1.5, 3], [[0, 0, 0], [0.06, 0, 0], [0, 0, 0]]), qt(id + '_Tay_Phai', [0, 1.5, 3], [[0, 0, 0], [-0.06, 0, 0], [0, 0, 0]])
  ]));
  // Đi bộ
  const W = 0.9;
  clips.push(new THREE.AnimationClip('Di_Bo', W, [
    qt(id + '_Chan_Trai', [0, W / 2, W], [[0.5, 0, 0], [-0.5, 0, 0], [0.5, 0, 0]]), qt(id + '_Chan_Phai', [0, W / 2, W], [[-0.5, 0, 0], [0.5, 0, 0], [-0.5, 0, 0]]),
    qt(id + '_Tay_Trai', [0, W / 2, W], [[-0.45, 0, 0], [0.45, 0, 0], [-0.45, 0, 0]]), qt(id + '_Tay_Phai', [0, W / 2, W], [[0.45, 0, 0], [-0.45, 0, 0], [0.45, 0, 0]]),
    pt(id + '_Than', [0, W / 4, W / 2, 3 * W / 4, W], [0, 0.04, 0, 0.04, 0]), headT([0, W / 2, W], [[0, 0, 0.04], [0, 0, -0.04], [0, 0, 0.04]])
  ]));
  // Ngồi gõ phím
  const sitLegs = [qt(id + '_Chan_Trai', [0], [[-Math.PI / 2, 0, 0]]), qt(id + '_Chan_Phai', [0], [[-Math.PI / 2, 0, 0]])];
  clips.push(new THREE.AnimationClip('Ngoi_Go_Phim', 0.5, [...sitLegs, pt(id + '_Than', [0], [0.07]),
    qt(id + '_Tay_Trai', [0, 0.25, 0.5], [[-1.62, 0, 0.12], [-1.54, 0, 0.12], [-1.62, 0, 0.12]]), qt(id + '_Tay_Phai', [0, 0.25, 0.5], [[-1.54, 0, -0.12], [-1.62, 0, -0.12], [-1.54, 0, -0.12]]),
    headT([0, 0.5], [[0.12, 0, 0], [0.12, 0, 0]])]));
  // Ngồi uống nước
  clips.push(new THREE.AnimationClip('Uong', 5, [...sitLegs, pt(id + '_Than', [0], [0.07]),
    qt(id + '_Tay_Trai', [0, 5], [[-1.5, 0, 0.1], [-1.5, 0, 0.1]]),
    qt(id + '_Tay_Phai', [0, 1.5, 2.2, 3.4, 4.1, 5], [[-1.5, 0, -0.1], [-1.5, 0, -0.1], [-2.35, 0, -0.5], [-2.35, 0, -0.5], [-1.5, 0, -0.1], [-1.5, 0, -0.1]]),
    headT([0, 2.2, 3.4, 5], [[0.05, 0, 0], [-0.2, 0, 0], [-0.2, 0, 0], [0.05, 0, 0]])]));
  // Vẫy tay
  clips.push(new THREE.AnimationClip('Vay_Tay', 1.2, [
    qt(id + '_Tay_Phai', [0, 0.3, 0.6, 0.9, 1.2], [[0, 0, 2.5], [0, 0, 2.9], [0, 0, 2.5], [0, 0, 2.9], [0, 0, 2.5]]),
    headT([0, 0.6, 1.2], [[0, 0, -0.08], [0, 0, 0.04], [0, 0, -0.08]]), pt(id + '_Than', [0, 0.6, 1.2], [0, 0.015, 0])]));
  // Pha chế
  clips.push(new THREE.AnimationClip('Pha_Che', 3.2, [
    qt(id + '_Tay_Trai', [0, 1.6, 3.2], [[-0.9, 0, 0.2], [-1.0, 0, 0.25], [-0.9, 0, 0.2]]),
    qt(id + '_Tay_Phai', [0, 0.8, 1.6, 2.4, 3.2], [[-0.7, 0, 0], [-1.35, 0, -0.3], [-1.2, 0, -0.5], [-1.35, 0, -0.3], [-0.7, 0, 0]]),
    headT([0, 1.6, 3.2], [[0.25, 0.1, 0], [0.3, -0.1, 0], [0.25, 0.1, 0]]), pt(id + '_Than', [0, 1.6, 3.2], [0, 0.01, 0])]));
  root.userData.preset = spec;
  return { root, clips };
}
if (typeof module !== 'undefined') module.exports = { buildCharacter, CHAR_PRESETS };
