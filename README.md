# Chilly Coffee

Quán cafe 3D "chill" để học và làm việc: chọn nhân vật chibi, vào quán, ngồi bàn và làm việc trên chiếc laptop 3D (Pomodoro, việc cần làm, ghi chú, nhạc).

Đây là **bản thử** viết bằng Three.js r149 thuần. Bối cảnh, quyết định đã chốt và việc còn lại: [docs/project-context.md](docs/project-context.md) — đọc file này trước khi làm tiếp.

## Chạy nhanh

Cần Node.js LTS và Python 3.

```bash
npm install
npm start      # đóng gói prototype/demo/model.js rồi mở server ở cổng 8765
```

- Bản thử: http://localhost:8765/prototype/demo/index.html
- Nhân vật: http://localhost:8765/prototype/gallery/index.html

## Cấu trúc

```
chilly-coffee/
├── src/                       code nguồn — sửa ở đây
│   ├── cafe/buildCafe.js      dựng toàn bộ quán
│   └── characters/characters.js  12 nhân vật chibi + hoạt ảnh
├── assets/                    sinh ra từ src/ bằng tools/
│   ├── cafe/                  cafe.glb, cafe.meta.json (chỗ ngồi, đèn), nav.json (lưới đi lại)
│   └── characters/            12 nhân vật .glb
├── prototype/
│   ├── demo/                  bản thử chính (model.js là file sinh ra, không commit)
│   └── gallery/               trang xem nhân vật
├── tools/                     xuất GLB, tạo lưới đi lại, đóng gói, chụp màn hình
└── docs/                      tài liệu dự án
```

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm start` | `build:pack` + `serve` |
| `npm run serve` | Server tĩnh ở cổng 8765 |
| `npm run build:cafe` | `src/cafe` → `assets/cafe/cafe.glb` + `cafe.meta.json` (cần `serve` đang chạy, Playwright) |
| `npm run build:nav` | `cafe.glb` → `assets/cafe/nav.json` (Python: trimesh, numpy, scipy, pillow, shapely, rtree) |
| `npm run build:pack` | `assets/cafe/*` → `prototype/demo/model.js` |
| `npm run build:chars` | `src/characters` → `assets/characters/*.glb` (cần `serve` đang chạy) |
| `npm run screenshot -- '<steps-json>'` | Chụp màn hình bản thử |
