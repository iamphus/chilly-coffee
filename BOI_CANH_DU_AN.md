# Chilly Coffee – bối cảnh dự án (đọc file này trước khi làm tiếp)

File này tóm tắt những gì đã làm và đã chốt trong các buổi làm việc với Claude trên claude.ai, để làm tiếp ở IDE khác (Antigravity, VS Code, Claude Code…). Nếu bạn là AI agent: đọc hết file này trước, rồi hỏi người dùng muốn làm bước nào trong mục "Việc còn lại".

Kế hoạch đầy đủ (bản online): https://claude.ai/artifact/AyMbj8iRAfxRn2iqsb7s7s

## 1. Ý tưởng

- Trang web công khai, miễn phí giai đoạn đầu (sau có thể kiếm tiền): một quán cafe 3D "chill" để học và làm việc.
- Mỗi người là một nhân vật chibi (đầu tròn, 2 tay 2 chân), vào quán, chọn bàn ngồi. Khi ngồi thì nhìn góc thứ nhất vào một chiếc laptop 3D trên bàn; màn hình laptop là giao diện kiểu macOS có Pomodoro, Việc cần làm, Ghi chú, Nhạc.
- Quán dựng lại bố cục quán thật Chihiro Coffee (Kiệt 03/6 Phan Thành Tài, Hòa Cường, Đà Nẵng) từ ảnh và video, đã bỏ tên, logo và người thật; có mở rộng thêm sân vườn và một phòng làm việc lớn. Tổng 28 chỗ ngồi.

## 2. Nhạc (đã chốt)

- Nhạc chung của quán: file nhạc CC0 / CC BY tự host, phát đồng bộ theo đồng hồ (mọi người cùng nghe cùng một đoạn). Bản thử hiện dùng "Radio Chilly" là lofi tự sinh bằng Web Audio để thay tạm.
- Playlist riêng: link YouTube, dùng trình phát nhúng chính thức hiển thị trên laptop (không chạy ngầm, không tách tiếng).
- Nút "Đeo tai nghe": tiếng quán nhỏ và trầm lại (lọc thấp 650 Hz, âm lượng ×0.35), playlist riêng phát.

## 3. Công nghệ (đã chốt cho bản thật)

- React + React Three Fiber + drei + Zustand, JavaScript, Vite, deploy Cloudflare Pages.
- Bản 2: Supabase (tài khoản, thấy người khác trong quán).
- Bản thử hiện tại viết bằng Three.js r149 thuần (một file HTML) để duyệt nhanh; khi chuyển sang R3F thì dùng lại mô hình GLB, dữ liệu chỗ ngồi, lưới đi lại và logic trong `demo/index.html`.

## 4. Các file

| File | Là gì |
|---|---|
| `cafe2.js` | Code dựng toàn bộ quán bằng Three.js (`buildCafe(THREE)` → `{root, lights, seats, ceiling, dbg}`). Texture tự sinh, gộp mesh theo vật liệu. |
| `cafe3.glb` | Mô hình quán đã xuất (~9 MB). |
| `cafe3.glb.json` | 28 chỗ ngồi (`n`, `label`, `c` = vị trí đầu người ngồi, `l` = điểm nhìn) và đèn. |
| `nav.json` | Lưới đi lại 0.1 m (bit 1 = bị chặn), tạo từ GLB bằng `tools/nav.py`. |
| `characters.js` | 12 nhân vật chibi (`CHAR_PRESETS`, `buildCharacter`), tỉ lệ `CHAR_SCALE = 0.65`, 6 hoạt ảnh: Dung, Di_Bo, Ngoi_Go_Phim, Uong, Vay_Tay, Pha_Che. |
| `nhan-vat/*.glb` | 12 nhân vật đã xuất riêng, có hoạt ảnh. |
| `demo/index.html` | Bản thử chạy được: tham quan, NPC, chế độ "Chơi thử" (bấm hoặc WASD để đi, ngồi bàn trống), góc nhìn thứ nhất với laptop kiểu MacBook (giao diện là HTML thật gắn lên nắp máy qua CSS3DRenderer), Pomodoro, to-do, ghi chú, nhạc, tai nghe. |
| `demo/model.js` | GLB + chỗ ngồi + lưới đi lại đóng gói base64 cho demo (tạo bằng `tools/pack_model.py`). |
| `gallery/index.html` | Trang xem 12 nhân vật và hoạt ảnh. |
| `tools/` | Công cụ xuất GLB (`index.html` + `run.js`), tạo lưới (`nav.py`), đóng gói (`pack_model.py`), xuất nhân vật (`chars.html` + `chars_run.js`), chụp màn hình test (`shot2.js`). |

## 5. Quy ước quan trọng

- Toạ độ trong `cafe2.js` là bản "chưa lật"; cuối hàm gốc được lật `root.scale.x = -1` để khớp quán thật. Vị trí trong GLB, `cafe3.glb.json`, `nav.json` là sau khi lật, nên x trong GLB = −x trong `cafe2.js`.
- Đơn vị mét. Cửa chính quanh x ≈ −4.2, z ≈ −0.5 (sau khi lật), luôn mở.
- Khu vực: phòng chính (bàn 1–10), phòng sau (bàn 11), sân vườn (bàn 12–14), phòng lớn (bàn 15–28).
- Tìm đường: Dijkstra 8 hướng trên `nav.json`, có phạt khi sát vật cản để nhân vật đi giữa lối; rút gọn đường bằng line-of-sight nhưng không cho sát hơn đường gốc.
- Lối đi đã được dọn (12/11/2026): bỏ hoặc dời quạt cây, chậu cây, ghế chắn lối. Đường từ cửa tới 26/28 bàn đều rộng ≥ 0.2 m tính từ vật cản đã nới; 2 bàn sofa (9, 28) hẹp hơn nhưng vẫn ngồi được.

## 6. Chạy bản thử trên máy

1. Cài Node.js (bản LTS) và Python 3.
2. Trong thư mục dự án: `npm install`, rồi `npm run serve`.
3. Mở http://localhost:8765/demo/index.html (bản thử) hoặc http://localhost:8765/gallery/index.html (nhân vật).

Sửa quán rồi dựng lại:

```
npx playwright install chromium
npm run build:cafe     # cafe2.js -> cafe3.glb + cafe3.glb.json (cần npm run serve đang chạy)
pip install trimesh numpy scipy pillow shapely rtree
npm run build:nav      # cafe3.glb -> nav.json
npm run build:pack     # -> demo/model.js
```

Lưu ý: bản thử nạp three.js từ CDN jsdelivr (three@0.149.0). YouTube chỉ phát được khi chạy trên web thật/localhost, không phát trong trang xem thử của claude.ai.

## 7. Việc còn lại

1. Chuyển sang dự án thật React Three Fiber + Vite, deploy Cloudflare Pages (cần GitHub + Cloudflare).
2. Làm nhẹ trang: nén GLB (Draco / meshopt, texture KTX2), chế độ đồ hoạ nhẹ cho laptop tầm trung.
3. Màn hình chọn nhân vật (trang phục, kiểu tóc).
4. Mưa và ngày/đêm theo giờ thật; NPC tránh va chạm nhau.
5. Thay nhạc tạm bằng bài CC0 thật; trang quyền riêng tư; xin phép chủ quán Chihiro nếu dùng bố cục quán công khai.
6. Bản 2: Supabase – đăng nhập, thấy người khác ngồi trong quán theo thời gian thực.
