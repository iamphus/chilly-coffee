# Chilly Coffee

Quán cafe 3D "chill" để học và làm việc: chọn nhân vật chibi, vào quán, ngồi bàn và làm việc trên chiếc laptop 3D (Pomodoro, việc cần làm, ghi chú, nhạc).

Repo gồm 2 phần:

- **App chính** (Vite + React + React Three Fiber), đang làm ở Giai đoạn 1. Hiện có landing (nền là video quảng cáo quay từ chính cảnh 3D) và nút "Vào quán" mở cảnh 3D, camera bay từ ngoài phố lên toàn cảnh. Ngày/đêm theo giờ máy; thêm `?time=day` hoặc `?time=night` vào URL để xem thử.
- **Bản thử** viết bằng Three.js r149 thuần trong `prototype/`. Bản này đã có đủ tính năng mẫu (chọn bàn, laptop, nhạc, tai nghe) để chuyển dần sang app chính.

Đọc trước khi làm tiếp: [docs/project-context.md](docs/project-context.md) (bối cảnh) và [docs/project-plan.md](docs/project-plan.md) (kế hoạch).

## Chạy nhanh

Cần Node.js LTS (xem `.node-version`). Bản thử cần thêm Python 3.

```bash
npm install
npm run dev        # app chính: http://localhost:5173
npm run prototype  # bản thử: đóng gói prototype/demo/model.js rồi mở server ở cổng 8765
```

- Bản thử: http://localhost:8765/prototype/demo/index.html
- Nhân vật: http://localhost:8765/prototype/gallery/index.html

## Cấu trúc

```
chilly-coffee/
├── index.html                 trang của app chính
├── src/
│   ├── main.jsx, App.jsx      khởi động app, Canvas 3D
│   ├── scene/                 cảnh 3D: quán, đèn ngày/đêm, sương, camera, người đi đường, khách
│   ├── characters/Character.jsx  một nhân vật chibi + hoạt ảnh (từ assets/characters/*.glb)
│   ├── ui/                    giao diện: landing (video nền, kiêm màn hình chờ), màn hình lỗi
│   ├── locales/{vi,en}/       chữ hiển thị (i18n), mặc định tiếng Việt
│   ├── store.js               trạng thái chung (Zustand)
│   ├── cafe/buildCafe.js      code dựng quán → xuất ra cafe.glb (dùng three r149)
│   └── characters/characters.js  12 nhân vật chibi + hoạt ảnh (dùng three r149)
├── assets/                    sinh ra từ src/ bằng tools/
│   ├── cafe/                  cafe.glb, cafe.meta.json (chỗ ngồi, đèn), nav.json (lưới đi lại)
│   ├── characters/            12 nhân vật .glb
│   └── video/                 video nền landing + ảnh poster (từ tools/render-video)
├── prototype/
│   ├── demo/                  bản thử chính (model.js là file sinh ra, không commit)
│   └── gallery/               trang xem nhân vật
├── tools/                     xuất GLB, tạo lưới đi lại, đóng gói, chụp màn hình, quay video nền
└── docs/                      tài liệu dự án
```

App chính dùng three mới nhất. Bản thử và các tool xuất GLB vẫn dùng three r149, cài dưới tên `three149` (`node_modules/three149`) để hai bên không đụng nhau.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy app chính ở chế độ phát triển (cổng 5173) |
| `npm run build` | Build app chính ra `dist/` (Cloudflare Pages dùng lệnh này) |
| `npm run preview` | Xem bản build trong `dist/` |
| `npm run lint` | Kiểm tra code app chính bằng ESLint |
| `npm run prototype` | `build:pack` + `serve` (bản thử) |
| `npm run serve` | Server tĩnh ở cổng 8765 |
| `npm run build:cafe` | `src/cafe` → `assets/cafe/cafe.glb` + `cafe.meta.json` (cần `serve` đang chạy, Playwright) |
| `npm run build:nav` | `cafe.glb` → `assets/cafe/nav.json` (Python: trimesh, numpy, scipy, pillow, shapely, rtree) |
| `npm run build:pack` | `assets/cafe/*` → `prototype/demo/model.js` |
| `npm run build:chars` | `src/characters` → `assets/characters/*.glb` (cần `serve` đang chạy) |
| `npm run build:video` | Quay video nền landing → `assets/video/` (cần `npm run dev` đang chạy). Thêm `-- --stills` để chỉ chụp ảnh từng cảnh quay, `-- --encode` để chỉ ghép lại |
| `npm run screenshot -- '<steps-json>'` | Chụp màn hình bản thử |

### Video nền landing

Video được quay từ chính cảnh 3D: `tools/render-video/shots.js` là kịch bản (mỗi cảnh quay là một đường đi của camera), `tools/render-video/main.jsx` dựng cảnh bằng các component trong `src/scene/`, `run.js` quay từng khung hình rồi ghép bằng ffmpeg (gói `ffmpeg-static`, không cần cài thêm). Sửa quán, nhân vật hoặc góc máy thì quay lại:

```bash
npm run dev                                   # cửa sổ 1
PW_CHANNEL=msedge npm run build:video         # cửa sổ 2 (Edge có sẵn để render bằng card đồ hoạ)
```

## Deploy (Cloudflare Pages)

Kết nối repo trên Cloudflare Pages với các thiết lập:

| Mục | Giá trị |
|---|---|
| Framework preset | Vite (hoặc None) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js | lấy từ file `.node-version` (24) |
