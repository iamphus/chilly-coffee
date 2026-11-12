# Chilly Coffee – bối cảnh dự án (đọc file này trước khi làm tiếp)

File này tóm tắt những gì đã làm và đã chốt trong các buổi làm việc với Claude trên claude.ai, để làm tiếp ở IDE khác (Antigravity, VS Code, Claude Code…). Nếu bạn là AI agent: đọc hết file này trước, rồi hỏi người dùng muốn làm bước nào trong mục "Việc còn lại".

Kế hoạch đầy đủ (bản online): https://claude.ai/artifact/AyMbj8iRAfxRn2iqsb7s7s
Bản lưu trong repo: [docs/project-plan.md](project-plan.md)

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
- Bản thử hiện tại viết bằng Three.js r149 thuần (một file HTML) để duyệt nhanh; khi chuyển sang R3F thì dùng lại mô hình GLB, dữ liệu chỗ ngồi, lưới đi lại và logic trong `prototype/demo/index.html`.
- App chính (Vite + R3F) đã có khung (12/11/2026): `index.html` + `src/main.jsx`, `src/App.jsx`, `src/scene/` (Cafe, Lighting, Scene), `src/ui/` (màn hình chờ, màn hình lỗi), `src/locales/`, `src/store.js`. Hiện mới hiển thị quán nhìn từ trên xuống, xoay được.
- Landing: nền là video quảng cáo kiểu TVC (`assets/video/landing-1440p.mp4` ~16 MB và `landing-1080p.mp4` ~11 MB, 22 giây, 60 fps) quay từ chính cảnh 3D bằng `tools/render-video/` (`npm run build:video`). Phần 3D (`src/scene/CafeCanvas.jsx`) là chunk riêng, tải trước khi trình duyệt rảnh, chỉ dựng khi bấm "Vào quán"; shader được biên dịch bất đồng bộ (`compileAsync`) trước khung hình đầu để không treo trang.
- Luồng vào quán: landing → màn chọn nhân vật (`src/ui/characterSelect/`, 10 nhân vật trong `src/characters/playableCharacters.js`, lưu `chilly.character` trong localStorage; quán tải ngầm phía sau) → xuất hiện ở đầu hẻm. Nhân vật đã chọn được bỏ khỏi khách / người đi đường.
- Đi lại trong quán làm theo `tham-khao/THAM_KHAO_SANSA.md` (đã xong mục 1, 2, 2b): xuất hiện ở đầu hẻm, góc nhìn thứ ba sau lưng, W A S D + bấm lên sàn (tìm đường trên `nav.json`), phím V đổi "Xoay tự do" (mặc định) ↔ "Khóa sau lưng". Code ở `src/player/`. Camera chỉ va với khối "kết cấu" (cao ≥ 1,6 m hoặc phẳng rộng ≥ 3 m), bàn ghế thì đi xuyên; bị tường ép thì camera tự nâng lên nhìn qua đầu. Bỏ camera nhìn từ trên xuống.
- Đã làm thêm theo tài liệu tham khảo: mục 3 (bảng tên "Tôi" + tên ngẫu nhiên, `src/ui/NameTag.jsx`, vị trí tính trong `ThirdPersonCamera`), mục 4 (thanh hành động; vươn vai và ngáp dựng bằng code trong `src/player/actionClips.js`), mục 5 (nút "Ngồi xuống" / phím E, góc nhìn thứ nhất + laptop `src/ui/laptop/`), mục 6 (các góc màn hình; bản đồ, âm thanh, nhạc quán còn là nút mờ "sắp có"), mục 7 (quầng đèn giả `LampGlows.jsx`, hạt bụi `DustMotes.jsx`, barista_2 đi lại trong quán). Chế độ nhẹ (30 fps) trong `CafeCanvas.jsx`; ngồi laptop không còn khoá 30 fps.
- Bên ngoài quán (`src/scene/surroundings/`): tấm ảnh phẳng "nhà đối diện" trong `cafe.glb` bị ẩn (`src/scene/backdrop.js`) và thay bằng công viên đài phun nước (bên kia đường), vườn hồ sen (bên kia hẻm), cây hoa (anh đào, bằng lăng, phượng), đèn công viên, đồi xa, bầu trời chuyển màu, trăng sao / mây, đom đóm. Vẽ bằng instancing (~35 lần vẽ), chỉ thêm 1 đèn thật (ánh trăng). Người chơi chưa đi vào công viên được (ngoài `nav.json`).
- Âm thanh (`src/audio/`): nhạc quán = mọi file trong `assets/music/` (không commit vì chưa rõ giấy phép; xem `assets/music/README.md`), phát như radio đồng bộ theo đồng hồ (`radio.js`, mốc 1/1/2026, kiểm tra lại mỗi 30 giây). Tạp âm phố tự tạo (`street.js`): xe cộ, gió, xe máy chạy ngang, chim (ngày), dế (tối). `audioEngine.js` trộn: ngoài đường tạp âm to + nhạc nhỏ lọc trầm 650 Hz; trong quán (Player đặt `store.inside`) nhạc to + tạp âm nhỏ lọc 900 Hz. Mở khoá AudioContext ở nút "Vào quán" / chọn nhân vật.
- Mưa (nút đám mây ở góc phải / phím R, lưu `chilly.rain`): `src/scene/Rain.jsx` — vệt mưa tính trong shader quanh camera, không rơi dưới mái quán (trừ sân vườn); trời xám và sương dày hơn (`lightingFor` trong `lightingPresets.js`); tiếng mưa tự tạo trong `street.js` (vào quán thì bị lọc trầm như nghe qua kính).
- Nhiều người (`src/net/`): `session.js` chọn Supabase Realtime (`transport/supabaseTransport.js`, khi có `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` trong `.env.local`) hoặc BroadcastChannel giữa các tab (`transport/localTransport.js`). Presence mang trạng thái (tên, nhân vật, ghế, laptop, hành động, Pomodoro, vị trí làm tròn); Broadcast mang vị trí (8 lần/giây khi đang đi) và chat. Phòng tối đa 20 người, đầy thì sang phòng sau. Người khác vẽ trong `remote/RemotePlayers.jsx` (nội suy), bảng tên + bong bóng trong `src/ui/PeerTags.jsx`, chat `src/ui/ChatPanel.jsx`, lọc `chatFilter.js` (lọc cả lúc gửi lẫn lúc nhận, giới hạn tốc độ), chặn theo phiên. Ghế người khác ngồi bị loại khỏi ghế trống; 2 người tranh ghế thì người ngồi sau đứng dậy.
- Khi chạy `npm run dev` có `window.__chilly = { gameRef, store }` để script thử đặt vị trí nhân vật.
- App chính dùng three mới nhất; bản thử và tool xuất GLB vẫn dùng r149, cài dưới tên `three149` (`node_modules/three149`).
- Khi chuyển đèn từ bản thử sang three mới: nhân cường độ với π, đọc mã màu đèn là giá trị tuyến tính, và chỉnh độ phản chiếu bằng `environmentIntensity` của cả cảnh (three mới bỏ qua `material.envMapIntensity` khi dùng `scene.environment`). Chi tiết ở đầu `src/scene/Lighting.jsx`.

## 4. Các file

```
src/        code nguồn (sửa ở đây)
assets/     file sinh ra từ src/ bằng tools/ (GLB, dữ liệu chỗ ngồi, lưới đi lại)
prototype/  các trang bản thử chạy trên trình duyệt
tools/      script xuất / dựng / đóng gói
docs/       tài liệu
```

| File | Là gì |
|---|---|
| `src/cafe/buildCafe.js` | Code dựng toàn bộ quán bằng Three.js (`buildCafe(THREE)` → `{root, lights, seats, ceiling, dbg}`). Texture tự sinh, gộp mesh theo vật liệu. (Trước đây là `cafe2.js`.) |
| `src/characters/characters.js` | 12 nhân vật chibi (`CHAR_PRESETS`, `buildCharacter`), tỉ lệ `CHAR_SCALE = 0.65`, 6 hoạt ảnh: Dung, Di_Bo, Ngoi_Go_Phim, Uong, Vay_Tay, Pha_Che. Bản duy nhất, demo/gallery/tool đều nạp file này. |
| `assets/cafe/cafe.glb` | Mô hình quán đã xuất (~9 MB). (Trước đây là `cafe3.glb`.) |
| `assets/cafe/cafe.meta.json` | 28 chỗ ngồi (`n`, `label`, `c` = vị trí đầu người ngồi, `l` = điểm nhìn) và đèn. (Trước đây là `cafe3.glb.json`.) |
| `assets/cafe/nav.json` | Lưới đi lại 0.1 m (bit 1 = bị chặn), tạo từ GLB bằng `tools/build_nav.py`. |
| `assets/characters/*.glb` | 12 nhân vật đã xuất riêng, có hoạt ảnh. Tên file = `id` trong `CHAR_PRESETS`: `guest_*` (khách), `barista_*`, `passerby_*` (người đi đường). (Trước đây là `nhan-vat/` với id tiếng Việt, xem bảng đổi tên ở mục 5.) |
| `prototype/demo/index.html` | Bản thử chạy được: tham quan, NPC, chế độ "Chơi thử" (bấm hoặc WASD để đi, ngồi bàn trống), góc nhìn thứ nhất với laptop kiểu MacBook (giao diện là HTML thật gắn lên nắp máy qua CSS3DRenderer), Pomodoro, to-do, ghi chú, nhạc, tai nghe. |
| `prototype/demo/model.js` | GLB + chỗ ngồi + lưới đi lại đóng gói base64 cho demo. **File sinh ra, không commit** — tạo bằng `npm run build:pack`. |
| `prototype/gallery/index.html` | Trang xem 12 nhân vật và hoạt ảnh. |
| `tools/export-cafe/` | Trang + script Playwright xuất `src/cafe/buildCafe.js` → `assets/cafe/cafe.glb` + `cafe.meta.json`. |
| `tools/export-characters/` | Trang + script Playwright xuất nhân vật → `assets/characters/*.glb`. |
| `tools/build_nav.py` | Tạo `assets/cafe/nav.json` từ GLB (ảnh xem trước ở `tmp/nav.png`). |
| `tools/pack_model.py` | Đóng gói → `prototype/demo/model.js`. |
| `tools/screenshot.js` | Chụp màn hình test bản thử (nên ghi ảnh vào `tmp/`, thư mục này không commit). |

## 5. Quy ước quan trọng

- Toạ độ trong `src/cafe/buildCafe.js` là bản "chưa lật"; cuối hàm gốc được lật `root.scale.x = -1` để khớp quán thật. Vị trí trong GLB, `cafe.meta.json`, `nav.json` là sau khi lật, nên x trong GLB = −x trong `buildCafe.js`.
- Đơn vị mét. Cửa chính quanh x ≈ −4.2, z ≈ −0.5 (sau khi lật), luôn mở.
- Khu vực: phòng chính (bàn 1–10), phòng sau (bàn 11), sân vườn (bàn 12–14), phòng lớn (bàn 15–28).
- Tìm đường: Dijkstra 8 hướng trên `nav.json`, có phạt khi sát vật cản để nhân vật đi giữa lối; rút gọn đường bằng line-of-sight nhưng không cho sát hơn đường gốc.
- Lối đi đã được dọn (12/11/2026): bỏ hoặc dời quạt cây, chậu cây, ghế chắn lối. Đường từ cửa tới 26/28 bàn đều rộng ≥ 0.2 m tính từ vật cản đã nới; 2 bàn sofa (9, 28) hẹp hơn nhưng vẫn ngồi được.
- Tên file và id nhân vật dùng tiếng Anh (đổi ngày 12/11/2026). `id` vừa là tên file GLB vừa là tiền tố tên node bên trong (`<id>_Dau`…), nên đổi id thì phải chạy lại `npm run build:chars`.

  | Id cũ | Id mới |
  |---|---|
  | `khach_hoodie`, `khach_cardigan`, `khach_quan_yem`, `khach_ao_len`, `khach_kinh`, `khach_tai_nghe` | `guest_hoodie`, `guest_cardigan`, `guest_overalls`, `guest_sweater`, `guest_glasses`, `guest_headphones` |
  | `di_duong_balo`, `di_duong_cong_so`, `di_duong_o`, `di_duong_chay_bo` | `passerby_backpack`, `passerby_office`, `passerby_umbrella`, `passerby_jogger` |
  | `barista_1`, `barista_2` | giữ nguyên |

- Tên bên trong mô hình (node nhân vật `_Than`, `_Dau`, `_Tay_Trai`…, hoạt ảnh `Dung`, `Di_Bo`, `Ngoi_Go_Phim`…, node quán `Ban_01`, `Tran`, `San`…) vẫn là tiếng Việt không dấu.

## 6. Chạy bản thử trên máy

1. Cài Node.js (bản LTS) và Python 3.
2. Trong thư mục dự án: `npm install`, rồi `npm run prototype` (= `build:pack` tạo `prototype/demo/model.js` + `serve`). App chính chạy bằng `npm run dev` (http://localhost:5173).
3. Mở http://localhost:8765/prototype/demo/index.html (bản thử) hoặc http://localhost:8765/prototype/gallery/index.html (nhân vật).

Sửa quán rồi dựng lại (mọi lệnh chạy từ thư mục gốc):

```
npx playwright install chromium
npm run build:cafe     # src/cafe/buildCafe.js -> assets/cafe/cafe.glb + cafe.meta.json (cần npm run serve đang chạy)
pip install trimesh numpy scipy pillow shapely rtree
npm run build:nav      # assets/cafe/cafe.glb -> assets/cafe/nav.json
npm run build:pack     # -> prototype/demo/model.js
npm run build:chars    # src/characters/characters.js -> assets/characters/*.glb (cần serve đang chạy)
```

Nếu không muốn tải Chromium của Playwright, có thể dùng trình duyệt đã cài sẵn qua biến `PW_CHANNEL`, ví dụ trên Windows: `PW_CHANNEL=msedge npm run build:chars` (bash) hoặc `$env:PW_CHANNEL='msedge'; npm run build:chars` (PowerShell).

Lưu ý: bản thử nạp three.js từ CDN jsdelivr (three@0.149.0); `tools/screenshot.js` chuyển các request đó sang `node_modules/three149`. YouTube chỉ phát được khi chạy trên web thật/localhost, không phát trong trang xem thử của claude.ai.

## 7. Việc còn lại

1. Chuyển sang dự án thật React Three Fiber + Vite, deploy Cloudflare Pages. Đã có khung và repo GitHub; còn kết nối Cloudflare Pages, rồi chuyển dần tính năng từ bản thử sang.
2. Làm nhẹ trang: nén GLB (Draco / meshopt, texture KTX2), chế độ đồ hoạ nhẹ cho laptop tầm trung.
3. Màn hình chọn nhân vật (trang phục, kiểu tóc).
4. Mưa và ngày/đêm theo giờ thật; NPC tránh va chạm nhau.
5. Thay nhạc tạm bằng bài CC0 thật; trang quyền riêng tư; xin phép chủ quán Chihiro nếu dùng bố cục quán công khai.
6. Bản 2: Supabase – đăng nhập, thấy người khác ngồi trong quán theo thời gian thực.
