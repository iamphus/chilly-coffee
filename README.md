# Chilly Coffee

Quán cafe 3D "chill" để học và làm việc: chọn nhân vật chibi, vào quán, ngồi bàn và làm việc trên chiếc laptop 3D (Pomodoro, việc cần làm, ghi chú, nhạc).

Repo gồm 2 phần:

- **App chính** (Vite + React + React Three Fiber), đang làm ở Giai đoạn 1. Hiện có landing (nền là video quảng cáo quay từ chính cảnh 3D) và nút "Vào quán" → màn chọn nhân vật (10 nhân vật có sẵn, nhớ lựa chọn cho lần sau) → xuất hiện ở đầu hẻm trước quán, góc nhìn thứ ba sau lưng nhân vật. Ngày/đêm theo giờ máy; thêm `?time=day` hoặc `?time=night` vào URL để xem thử.
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
│   ├── scene/                 cảnh 3D: quán, đèn ngày/đêm, sương, người đi đường, khách
│   │   └── surroundings/      bên ngoài: công viên đài phun nước, vườn hồ sen, cây hoa, đèn, đồi, bầu trời (bố cục ở layout.js)
│   ├── player/                nhân vật người chơi: di chuyển, ngồi, hành động, tìm đường (nav.js), va chạm (colliders.js), camera
│   ├── audio/                 nhạc quán (radio đồng bộ theo đồng hồ), tạp âm phố tự tạo bằng Web Audio, trộn trong / ngoài quán
│   ├── focus/                 Pomodoro, việc cần làm, ghi chú (focusStore.js lưu localStorage), thông báo khi hết giờ
│   ├── characters/Character.jsx  một nhân vật chibi + hoạt ảnh (từ assets/characters/*.glb)
│   ├── ui/                    giao diện: landing (video nền), màn chọn nhân vật (characterSelect/), giao diện trong game (GameHud), màn hình lỗi
│   ├── locales/{vi,en}/       chữ hiển thị (i18n), mặc định tiếng Việt
│   ├── store.js               trạng thái chung (Zustand)
│   ├── cafe/buildCafe.js      code dựng quán → xuất ra cafe.glb (dùng three r149)
│   └── characters/characters.js  12 nhân vật chibi + hoạt ảnh (dùng three r149)
├── assets/                    sinh ra từ src/ bằng tools/
│   ├── cafe/                  cafe.glb, cafe.meta.json (chỗ ngồi, đèn), nav.json (lưới đi lại)
│   ├── characters/            12 nhân vật .glb
│   ├── music/                 file nhạc quán (không commit, xem assets/music/README.md)
│   └── video/                 video quảng cáo landing (2K + 1080p) + ảnh poster (từ tools/render-video)
├── prototype/
│   ├── demo/                  bản thử chính (model.js là file sinh ra, không commit)
│   └── gallery/               trang xem nhân vật
├── tools/                     xuất GLB, tạo lưới đi lại, đóng gói, chụp màn hình, quay video nền
└── docs/                      tài liệu dự án
```

App chính dùng three mới nhất. Bản thử và các tool xuất GLB vẫn dùng three r149, cài dưới tên `three149` (`node_modules/three149`) để hai bên không đụng nhau.

## Điều khiển trong quán

| Thao tác | Khóa sau lưng | Xoay tự do (mặc định) |
|---|---|---|
| W / S (mũi tên lên/xuống) | Đi tới / lùi chậm theo hướng nhân vật | Đi ra xa / về phía camera |
| A / D (mũi tên trái/phải) | Xoay nhân vật, camera xoay theo | Đi ngang so với camera |
| Shift | Chạy | Chạy |
| Bấm lên sàn | Tự tìm đường tới đó, camera bám sau lưng | Tự tìm đường, camera giữ góc |
| Kéo chuột (trái hoặc phải) | Nhìn quanh tạm thời; đi tiếp thì camera về sau lưng | Xoay camera và giữ góc |
| Lăn chuột | Phóng to / thu nhỏ | Phóng to / thu nhỏ |
| V hoặc nút góc trên phải | Đổi chế độ camera (lưu cho lần sau) | |
| E / nút "Ngồi xuống" | Ngồi vào ghế trống gần nhất (dưới 1,2 m); bấm thẳng vào ghế trống thì tự đi tới rồi ngồi | |
| 1 2 3 4 | Vẫy tay, uống cà phê, vươn vai, ngáp (bấm lại để dừng) | |
| Esc / E khi đang ngồi | Đứng dậy | |

Khi ngồi: camera chuyển sang góc nhìn thứ nhất, màn hình laptop có Pomodoro (thông báo trình duyệt khi hết giờ), việc cần làm, ghi chú; mọi thứ lưu trong localStorage (`chilly.focus`). Đồng hồ vẫn chạy khi đứng dậy đi lại (hiện ở góc trái và trên tiêu đề tab). Cài đặt (góc phải): chế độ nhẹ (tắt bóng, độ phân giải 1×, 30 fps), thời gian Ngày / Tối / Theo giờ. Chấm màu ở góc phải để đổi nhân vật.

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

Video kiểu TVC được quay từ chính cảnh 3D: nhân vật chính đeo tai nghe đi dọc hẻm vào quán (máy quay ngang tầm mắt bám theo), ngồi gõ laptop, rồi các cảnh trong quán và bay lên toàn cảnh; video lặp liền mạch.

- `tools/render-video/shots.js`: kịch bản (cảnh quay, góc máy, cắt thẳng hay mờ dần, độ phân giải)
- `tools/render-video/hero.js`: đường đi và hoạt ảnh của nhân vật chính
- `tools/render-video/main.jsx`: dựng cảnh bằng các component trong `src/scene/`
- `tools/render-video/run.js`: render ở 3840×2160 rồi ghép bằng ffmpeg (gói `ffmpeg-static`) ra 2 bản 2560×1440 và 1920×1080; landing tự chọn bản theo màn hình

Sửa quán, nhân vật hoặc kịch bản thì quay lại:

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
