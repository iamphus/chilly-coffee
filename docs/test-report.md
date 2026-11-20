# Báo Cáo Kiểm Thử (QA / Tester Report) – Chilly Coffee

- **Dự án:** Chilly Coffee (`chilly-coffee` v0.1.0)
- **Ngày kiểm thử:** 18/11/2026
- **Vai trò thực hiện:** QA / Tester (Kiểm thử Tính năng, Giao diện UI/UX, Hiệu năng WebGL & Tương thích màn hình)
- **Phương pháp kiểm thử:**
  1. **Kiểm thử tĩnh & đóng gói:** `npm run lint` (ESLint) + `npm run build` (Vite 8 + nén GLB Meshopt).
  2. **Kiểm thử động tự động (E2E & UI Layout):** Chạy server thực tế kết hợp kịch bản Playwright kiểm tra toàn bộ luồng người dùng, đo toạ độ khung giao diện (`getBoundingClientRect`), thông số dựng hình GPU (`gl.info`) và chụp đối chiếu màn hình ở 5 kích thước: `1440×900` (Desktop chuẩn), `1280×720` (Laptop HD), `1024×680` (Cửa sổ vừa), `900×600` (Màn nhỏ), `390×844` (Điện thoại).
  3. **Rà soát logic mã nguồn (White-box QA):** Kiểm tra các ca biên (edge cases) về đồng bộ phòng, bộ lọc chat, lưu trữ `localStorage`, đa ngôn ngữ `i18n` và tuân thủ chính sách nhúng YouTube.

---

## 1. Tổng quan đánh giá

| Hạng mục                                                     | Kết quả               | Tóm tắt nhanh                                                                                                                                                                                |
| ------------------------------------------------------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kiểm tra mã nguồn (`eslint`)**                             | **ĐẠT**               | 0 lỗi, 0 cảnh báo.                                                                                                                                                                           |
| **Đóng gói bản phát hành (`vite build`)**                    | **ĐẠT (Có cảnh báo)** | Build thành công sau `1.62s`. Nén `.glb` giảm 46%–65% dung lượng. Cảnh báo 1 gói JS lớn (`1.056 kB`, gzip `287 kB`).                                                                         |
| **Độ ổn định Runtime (Crash / Console)**                     | **ĐẠT**               | `0` lỗi JavaScript crash (`pageerror = 0`) xuyên suốt mọi màn hình; `ErrorBoundary` hoạt động sẵn sàng.                                                                                      |
| **Luồng tính năng cốt lõi trên Desktop rộng (`≥ 1440×900`)** | **TỐT (8.5/10)**      | Vào quán, chọn/phối đồ nhân vật, đi lại tìm đường, sơ đồ 2D, ngồi bàn mở laptop, Pomodoro, To-do, Ghi chú, Nhạc YouTube, mưa/ngày/đêm, phòng riêng & chat đều chạy mượt.                     |
| **Giao diện UI & Responsive (`≤ 1280×720` & Mobile)**        | **CẦN SỬA (6/10)**    | Phát hiện lỗi `z-index` làm nút "Nhạc quán" đè lên bảng "Cài đặt", khung Laptop đè HUD ở `1280×720`, Tủ đồ che khuất nhân vật ở màn nhỏ, và vỡ giao diện khi vào quán trên điện thoại.       |
| **Ngân sách hiệu năng 3D (`WebGL`)**                         | **CHƯA ĐẠT CHỈ TIÊU** | Thực tế đo được **1.051 draw calls / ~596k tam giác** (chế độ nhẹ: **586 draw calls / ~345k tam giác**), vượt xa mục tiêu `< 150 draw calls / < 300k tam giác` trong `docs/project-plan.md`. |

### Điểm sáng đáng khen ngợi

- **Trải nghiệm "cozy" rất chỉn chu:** Chuyển cảnh mờ dần từ Landing → Chọn nhân vật → Quán 3D mượt; biên dịch shader bất đồng bộ (`gl.compileAsync`) giúp khung hình đầu không bị giật đơ.
- **Xử lý link YouTube thông minh:** Tự động cứu các link YouTube Mix (`&list=RD...`) chuyển về phát video đơn thay vì treo vòng lặp vô tận; khung phát giữ đúng chuẩn tối thiểu `≥ 200×200px` (`340×200px` trên desktop); gập máy tự động tháo tai nghe để không phát nhạc ngầm sai chính sách YouTube.
- **Chi tiết UX tinh tế:** Hộp thoại xác nhận "Rời khỏi quán?" có cảnh báo riêng khi đồng hồ Pomodoro đang chạy; bấm `Esc` khi hộp thoại xác nhận mở chỉ đóng hộp thoại mà không làm gập nhầm laptop; đồng hồ Pomodoro tính theo mốc `endsAt` nên ẩn tab không bị trôi giờ và hiện trực tiếp lên tiêu đề tab trình duyệt.

---

## 2. Bảng kết quả kiểm thử chi tiết (Tính năng & UI)

### 2.1. Màn hình chào (`Landing`) & Trang Chính sách riêng tư (`/privacy`)

| Mã TC   | Kịch bản kiểm thử                                                            | Kết quả      | Ghi chú thực tế                                                                                                                     |
| ------- | ---------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `TC-01` | Hiển thị nền video TVC, poster, tiêu đề, nút "Vào quán" ở Desktop `1440×900` | **ĐẠT**      | Video tự chạy (`muted`, `loop`, `playsInline`), lớp phủ tối (`.landing__scrim`) giữ độ tương phản chữ rất dễ đọc, không tràn ngang. |
| `TC-02` | Hiển thị Landing trên điện thoại `390×844`                                   | **ĐẠT**      | Ẩn danh sách tính năng phụ để chừa chỗ cho nền, nút "Vào quán" nằm gọn trong màn hình, dễ bấm.                                      |
| `TC-03` | Nội dung giới thiệu 3 tính năng ở Landing                                    | **LỖI NHẸ**  | Mục "Ngồi cạnh nhau" vẫn hiện nhãn **"Sắp có"** và ghi **"không chat"**, dù tính năng nhiều người & chat đã mở (xem `CONTENT-01`).  |
| `TC-04` | Mở trang `/privacy`, kiểm tra nội dung Tiếng Việt & nút chuyển Tiếng Anh     | **ĐẠT**      | Đổi sang `English` cập nhật ngay nội dung, `<title>`, `<meta description>` và `lang="en"`.                                          |
| `TC-05` | Chuyển `English` ở `/privacy` rồi bấm `"← Back to Chilly Coffee"`            | **THẤT BẠI** | Quay về `/` bị reset lại Tiếng Việt (`"Vào quán"`). Toàn bộ app chính cũng thiếu nút đổi ngôn ngữ (xem `FUNC-01`).                  |

### 2.2. Màn chọn nhân vật & Tủ đồ 3D (`CharacterSelect` & `WardrobePanel`)

| Mã TC   | Kịch bản kiểm thử                                                                                                 | Kết quả       | Ghi chú thực tế                                                                                                          |
| ------- | ----------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `TC-06` | Đổi 10 mẫu nhân vật bằng nút mũi tên, phím `←` / `→` (`A` / `D`), bấm trực tiếp vào nhân vật                      | **ĐẠT**       | Chuyển mẫu mượt (`1 / 10` → `2 / 10`), nhớ lựa chọn vào `localStorage`.                                                  |
| `TC-07` | Mở "Phối đồ": đổi 4 tab (`Tóc`, `Áo`, `Quần`, `Phụ kiện`), chọn màu, bấm `Ngẫu nhiên` & `Mặc định`, kéo xoay 360° | **ĐẠT**       | Cập nhật mô hình 3D tức thì, hiện huy hiệu `"· Đã phối"`, đội mũ lưỡi trai tự bỏ mũ nồi (không chồng 2 mũ).              |
| `TC-08` | Đặt tên hiển thị, nút xúc xắc đổi tên ngẫu nhiên, giới hạn 24 ký tự                                               | **ĐẠT**       | Nhập tên, `Enter`/`blur` lưu ngay vào `chilly.nickname`.                                                                 |
| `TC-09` | Đặt tên hiển thị chứa từ nhạy cảm (vd: `"đm"`)                                                                    | **LỖI LOGIC** | Bị lọc thành `"**"` nhưng chuỗi `"**"` không rỗng nên được nhận luôn làm tên hiển thị trên đầu nhân vật (xem `FUNC-03`). |
| `TC-10` | Bố cục Tủ đồ ở màn hình `1024×680` và `≤ 860px` (`390×844`)                                                       | **THẤT BẠI**  | Ở `1024×680` khung Tủ đồ đè lên nút "Phối đồ"; ở `≤ 860px` khung Tủ đồ đè kín mặt và thân nhân vật 3D (xem `UI-03`).     |

### 2.3. Cảnh quán 3D, Di chuyển, Camera & HUD trong quán (`Scene`, `Player`, `GameHud`)

| Mã TC   | Kịch bản kiểm thử                                                                                                                 | Kết quả             | Ghi chú thực tế                                                                                                         |
| ------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `TC-11` | Vào quán, kiểm tra vị trí xuất hiện đầu hẻm, bảng tên `"Tôi"`, gợi ý phím tắt tự ẩn sau 8 giây                                    | **ĐẠT**             | Tải & biên dịch shader mất ~4,5 giây trên máy test; bảng tên bám đỉnh đầu mượt.                                         |
| `TC-12` | Đi bộ `WASD` / phím mũi tên, giữ `Shift` chạy, bấm sàn tự tìm đường, đổi camera `V` (Xoay tự do ↔ Khóa sau lưng), cuộn chuột zoom | **ĐẠT**             | Tìm đường tránh vật cản tốt, va tường trượt dọc cạnh tường không bị kẹt cứng; ép sát tường camera tự nâng cao góc nhìn. |
| `TC-13` | Thanh hành động đáy màn hình (phím `1` `2` `3` `4`: Vẫy tay, Uống cà phê, Vươn vai, Ngáp)                                         | **ĐẠT**             | Bấm lặp lại tự dừng; bước đi tự huỷ hành động; đang ngồi không kích hoạt nhầm phím `1–4`.                               |
| `TC-14` | Sơ đồ quán 2D (phím `M`): hiển thị khu vực, số bàn trống, bấm bàn trống tự đi tới ngồi                                            | **ĐẠT**             | Đếm đúng số bàn trống (`Còn 17 bàn trống`), phân biệt màu Trống / Cùng phòng / Tôi, bấm bàn bận báo toast rõ ràng.      |
| `TC-15` | Bật/tắt mưa (`R`), đổi thời gian Ngày / Chiều / Tối / Theo giờ, bật Chế độ nhẹ, chỉnh thanh trượt âm lượng                        | **ĐẠT (Tính năng)** | Ánh sáng, màu trời, sương mù và hạt mưa chuyển mượt; lưu `localStorage` đầy đủ.                                         |
| `TC-16` | Kiểm tra hiển thị khi mở bảng "Cài đặt" ở góc trên phải                                                                           | **THẤT BẠI (UI)**   | Nút `"♫ Nhạc quán · ..."` nằm đè lên phần đầu bảng Cài đặt, che khuất chữ `"Tên hiển thị"` (xem `UI-01`).               |
| `TC-17` | Mở đồng thời Sơ đồ quán và Phòng riêng / Cài đặt                                                                                  | **ĐẠT**             | Bấm mở Sơ đồ tự đóng Phòng riêng (và ngược lại); bấm ra ngoài (`pointerdown`) tự đóng popover.                          |
| `TC-18` | Kiểm tra nút "Đổi nhân vật" khi đang ngồi ghế                                                                                     | **ĐẠT**             | Nút tự `disabled` khi đang ngồi để tránh lỗi tư thế nhân vật.                                                           |

### 2.4. Ngồi bàn & Giao diện Laptop 3D (`LaptopScreen`, `Pomodoro`, `Todo`, `Notes`, `Music`)

| Mã TC   | Kịch bản kiểm thử                                                                                                           | Kết quả           | Ghi chú thực tế                                                                                                                                                      |
| ------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TC-19` | Ngồi ghế (`E` hoặc bấm ghế) → Mở laptop (`E`) → Gập máy (`Esc` / `E`) → Đứng dậy (`Esc`)                                    | **ĐẠT**           | Góc nhìn lướt mượt vào màn hình laptop; thứ tự phím `Esc` (bỏ ô đang gõ → gập laptop → đứng dậy) rất tự nhiên.                                                       |
| `TC-20` | **Pomodoro:** Bắt đầu, Tạm dừng, Tiếp tục, Đặt lại, Bỏ qua lượt, chỉnh thời lượng (1–120 phút), biểu đồ 7 ngày & chuỗi ngày | **ĐẠT**           | Tự giới hạn số phút trong khoảng `1..120`; giờ còn lại hiện trên thanh trên laptop, tiêu đề tab trình duyệt, và chip góc trái HUD khi gập máy.                       |
| `TC-21` | **Việc cần làm (To-do):** Thêm việc, đánh dấu hoàn thành, đếm việc còn lại, xoá việc, tải lại trang                         | **ĐẠT**           | Lưu tức thì vào `localStorage` (`chilly.focus`), giới hạn 200 ký tự/việc, nút thêm tự khoá khi chỉ gõ khoảng trắng.                                                  |
| `TC-22` | **Ghi chú (Notes):** Soạn văn bản nhiều dòng, tự động lưu                                                                   | **ĐẠT**           | Tối đa 20.000 ký tự, giữ nguyên nội dung sau khi đóng/mở laptop và F5.                                                                                               |
| `TC-23` | **Nhạc riêng (YouTube):** Nhập link sai định dạng / tên miền lạ                                                             | **ĐẠT**           | Báo lỗi đỏ rõ ràng (`role="alert"`), không tải iframe.                                                                                                               |
| `TC-24` | **Nhạc riêng (YouTube):** Dán link hợp lệ / link Mix `RD...`, kiểm tra kích thước khung phát & tự bật tai nghe              | **ĐẠT**           | Tự cứu link Mix về video đơn, tự bật tai nghe, khung phát `340×200px` đạt chuẩn YouTube (`≥ 200×200px`).                                                             |
| `TC-25` | Gập laptop khi đang đeo tai nghe → sau đó bấm phím `H` khi laptop đang gập                                                  | **LỖI UX NHẸ**    | Gập laptop tự tháo tai nghe đúng thiết kế; nhưng bấm `H` khi laptop đang đóng vẫn bật `"Đang đeo tai nghe · nhạc quán tắt"` dù YouTube không thể phát (xem `UX-01`). |
| `TC-26` | Bố cục Laptop khi có khung YouTube ở màn hình `1280×720`, `900×600` và `390×844`                                            | **THẤT BẠI (UI)** | Ở `1280×720` viền laptop đè lên nút Nhạc quán góc phải & cắt phần cài đặt phút Pomodoro; ở `390×844` vỡ nặng toàn bộ khung laptop (xem `UI-02`, `UI-04`).            |

### 2.5. Nhiều người chơi, Phòng riêng & Trò chuyện (`NetworkSync`, `RoomPopover`, `ChatPanel`)

| Mã TC   | Kịch bản kiểm thử                                                                                                     | Kết quả          | Ghi chú thực tế                                                                                                                                    |
| ------- | --------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TC-27` | Kết nối phòng công khai, tạo phòng riêng (`?room=...`), chép link mời, nhập mã phòng (2–20 ký tự), quay về quán chung | **ĐẠT**          | Chuẩn hoá mã phòng có dấu tiếng Việt sang slug không dấu (`"Cà phê"` → `ca-phe`), đồng bộ URL để F5 không mất phòng.                               |
| `TC-28` | Mở khung chat (`Enter`), gửi tin nhắn, hiện bong bóng chat trên đầu nhân vật, đóng bằng `Esc`                         | **ĐẠT**          | Tin mới tự cuộn xuống đáy; khi đóng chat vẫn hiện tối đa 4 tin gần nhất trong 12 giây.                                                             |
| `TC-29` | Giới hạn tốc độ gửi chat (chống spam)                                                                                 | **ĐẠT**          | Gửi liên tiếp `< 1,2s` hoặc quá `5 tin / 15s` bị chặn kèm thông báo `"Bạn gửi hơi nhanh, đợi chút nhé."`.                                          |
| `TC-30` | Bộ lọc từ tục tiếng Việt / tiếng Anh (`chatFilter.js`)                                                                | **LỖI MỘT PHẦN** | Từ không dấu nhập nhằng (`"lớn"`, `"đeo"`) không bị che nhầm, `"dm"` bị che thành `"**"`; nhưng `"đụ má"` chỉ che thành `"** má"` (xem `FUNC-03`). |
| `TC-31` | Gửi chat khi mất kết nối mạng / lỗi kênh Supabase                                                                     | **LỖI LOGIC**    | Không báo lỗi `"Chưa kết nối được..."` mà vẫn hiện tin nhắn cục bộ như đã gửi thành công (xem `FUNC-02`).                                          |

---

## 3. Danh sách Bug & Vấn đề cần khắc phục (Chi tiết kỹ thuật cho Dev)

### Ưu tiên Cao (High)

#### `PERF-01` – Số lượng Draw Calls và Tam giác vượt xa ngân sách hiệu năng mục tiêu

- **Mức độ:** Cao (ảnh hưởng trực tiếp FPS, nhiệt độ máy và thời lượng pin trên laptop sinh viên dùng GPU tích hợp).
- **Số liệu đo thực tế (`gl.info`):**
  - Chế độ mặc định: **1.051 draw calls**, **596.516 tam giác** (Mục tiêu trong `docs/project-plan.md`: `< 150 draw calls`, `< 300.000 tam giác`).
  - Chế độ nhẹ (`Lite`): **586 draw calls**, **344.624 tam giác**.
- **Nguyên nhân & vị trí liên quan:**
  - `src/scene/Scene.jsx`, `src/scene/Guests.jsx`, `src/scene/Passersby.jsx`, `src/cafe/buildCafe.js`: Mỗi nhân vật NPC / người đi đường tạo ~6 khối mesh riêng và bật `castShadow`, cộng với nhiều mesh trong `cafe.glb` và cảnh xung quanh.
  - `src/scene/CafeCanvas.jsx` (dòng 73–84): Khi mở màn hình laptop (`laptopOpen === true`) ở chế độ thường, `frameloop` vẫn để `'always'` thay vì hạ xuống 30fps như kế hoạch ban đầu.
- **Đề xuất khắc phục:**
  1. Tắt `castShadow` cho các chi tiết nhỏ / NPC ở xa hoặc chỉ bật bóng cho một số khối chính.
  2. Gộp thêm các mesh tĩnh cùng vật liệu trong `buildCafe.js`.
  3. Trong `CafeCanvas.jsx`, kích hoạt `limited = lite || laptopOpen` để tự động hạ xuống 30fps khi người dùng đang mở màn hình laptop làm việc.

---

#### `UI-01` – Lỗi `z-index` (CSS Stacking Context) khiến nút `"Nhạc quán"` đè xuyên lên bảng `"Cài đặt"`

- **Mức độ:** Cao (lỗi hiển thị thấy ngay lập tức ở mọi độ phân giải khi mở Cài đặt).
- **Các bước tái hiện:**
  1. Vào quán ở bất kỳ kích thước màn hình nào.
  2. Bấm biểu tượng **Cài đặt** (góc trên bên phải).
  3. Quan sát vùng tiêu đề `"Tên hiển thị"` của bảng Cài đặt.
- **Kết quả thực tế:** Nút `"♫ Nhạc quán · Khói Cà Phê Sớm"` nằm đè lên trên hộp thoại Cài đặt, che mất dòng chữ `"Tên hiển thị"`. Lỗi tương tự cũng xảy ra ở góc trên trái khi chip đồng hồ `.hud-timer` hiện bên dưới thanh nút và người dùng mở `Sơ đồ quán` hoặc `Phòng & lời mời`.
- **Nguyên nhân gốc (`src/ui/gameHud.css` dòng 95–106 & 238–242):**
  - `.hud-popover` có `z-index: 9`, nhưng nằm bên trong `.hud-pill` thứ nhất có `backdrop-filter: blur(8px)`. Thuộc tính `backdrop-filter` tạo một stacking context mới có `z-index: auto`.
  - Nút `"Nhạc quán"` là phần tử `.hud-pill` thứ hai đứng sau trong DOM (cũng có `backdrop-filter`), nên toàn bộ nhánh con của `.hud-pill` thứ nhất bị vẽ nằm dưới phần tử thứ hai.
- **Đề xuất khắc phục:** Thêm `position: relative; z-index: 2;` cho `.hud-corner > .hud-pill:first-child` (hoặc đưa các popover ra làm con trực tiếp của `.hud-corner`).

---

#### `UI-02` – Màn hình Laptop 3D đè lên cụm HUD góc phải và bị thiếu chiều dọc ở độ phân giải Laptop `1280×720`

- **Mức độ:** Cao (rất nhiều laptop Windows 13"–15.6" bật scale 125%–150% có viewport thực tế quanh `1280×720` hoặc `1366×768`).
- **Các bước tái hiện:**
  1. Đặt kích thước trình duyệt `1280×720`, ngồi vào bàn và bấm `E` mở laptop.
  2. Vào tab `Nhạc riêng`, dán một link YouTube để hiện cột trình phát bên phải, sau đó chuyển về tab `Pomodoro`.
- **Kết quả thực tế:**
  - Viền trên phải của `.laptop` (`960×576px`, `top: 72px`) đè trực tiếp lên nửa trái nút `"♫ Đang đeo tai nghe · nhạc quán tắt"` trên HUD.
  - Trong tab `Pomodoro`, khối `"Thời lượng (phút)"` bị đẩy xuống sát mép dưới và cắt mất nửa ô nhập số.
- **Đề xuất khắc phục (`src/ui/laptop/laptop.css`):**
  - Ẩn bớt nút trạng thái nhạc quán trên HUD khi `laptopOpen === true` (vì trong app Nhạc trên laptop đã có thông tin đài phát).
  - Giảm nhẹ `padding` và cỡ chữ đồng hồ `.pomodoro__time` (`clamp(2.6rem, 6.5vh, 5.5rem)`) theo `vh` để toàn bộ giao diện Pomodoro vừa khít không cần cuộn ở chiều cao `720px`.

---

### Ưu tiên Trung bình (Medium)

#### `FUNC-01` – Đổi ngôn ngữ ở `/privacy` không được lưu lại và thiếu nút đổi ngôn ngữ trong ứng dụng chính

- **Vị trí:** `src/i18n.js` (dòng 6–15), `src/pages/privacy/PrivacyPage.jsx` (dòng 26–31), `src/ui/GameHud.jsx` (`SettingsPopover`).
- **Hiện tượng:** Bộ từ điển Tiếng Anh (`src/locales/en/common.json`) đã hoàn thiện đầy đủ, nhưng `i18n.js` gán cứng `lng: 'vi'`. Khi đổi sang `English` ở `/privacy` rồi bấm quay lại quán (`href="/"`), trang tải lại về `vi`. Người dùng nước ngoài mở trang chính cũng không có chỗ chuyển sang Tiếng Anh.
- **Đề xuất khắc phục:** Lưu mã ngôn ngữ vào `localStorage` (`chilly.lang`, fallback theo `navigator.language`), đọc lại trong `src/i18n.js`, và thêm nút chọn `Tiếng Việt / English` ở góc Landing + trong `SettingsPopover`.

---

#### `FUNC-02` – `sendChat()` không kiểm tra trạng thái `connected`, khiến tin nhắn lúc rớt mạng không báo lỗi mà hiển thị giả thành công

- **Vị trí:** `src/net/session.js` (dòng 55–66 & 95–98).
- **Hiện tượng:** `sendChat` chỉ kiểm tra `if (!transport) return 'offline'`. Khi biến môi trường Supabase được bật nhưng mạng người dùng rớt hoặc WebSocket timeout (`connected === false`), `transport` vẫn tồn tại nên hàm không trả về `'offline'`, người gửi vẫn thấy tin nhắn hiện trong danh sách chat của mình dù không ai nhận được.
- **Đề xuất khắc phục:** Đổi điều kiện thành `if (!transport || !useNetStore.getState().connected) return 'offline'`.

---

#### `FUNC-03` – Bộ lọc từ tục che sót vế sau của cụm từ ghép và cho phép tên hiển thị thành `"**"`

- **Vị trí:** `src/net/chatFilter.js` (dòng 11–21) và `src/store.js` (dòng 38–40, 125–130).
- **Hiện tượng:**
  1. Do `'đụ'` và `'địt'` đứng trước `'đụ má'`, `'đụ mẹ'`, `'địt mẹ'` trong mảng `BANNED`, biểu thức chính quy khớp từ ngắn trước nên `"đụ má"` chỉ thành `"** má"`.
  2. Đặt tên là `"đm"` sẽ biến thành tên hiển thị `"**"` trên bảng tên.
- **Đề xuất khắc phục:**
  1. Sắp xếp `[...BANNED].sort((a, b) => b.length - a.length)` trước khi tạo `PATTERN`.
  2. Trong `sanitizeNickname()`, nếu chuỗi sau khi lọc không chứa ít nhất 1 chữ cái hoặc chữ số (`!/[\p{L}\p{N}]/u.test(cleaned)`), trả về `''` để tự động gán `randomNickname()`.

---

#### `UI-03` – Bảng Tủ đồ (`WardrobePanel`) đè lên nút điều khiển ở `1024×680` và che kín mặt nhân vật ở `≤ 860px`

- **Vị trí:** `src/ui/characterSelect/characterSelect.css` (dòng 111–128 & 254–264).
- **Hiện tượng:** Ở `1024×680`, `.wardrobe` đè lên nút `"Phối đồ"`. Ở `≤ 860px`, `.wardrobe` căn giữa đè thẳng lên đầu và thân nhân vật 3D khiến người dùng không nhìn thấy món đồ đang thử.
- **Đề xuất khắc phục:** Trên màn hình hẹp, đặt `.wardrobe` thành ngăn kéo dưới đáy (`max-height: 36vh`) và đẩy góc nhìn camera của `CharacterSelect` lên cao hơn một chút khi `customizing === true`.

---

#### `UI-04` – Chưa có rào chắn hoặc bố cục tối thiểu trên điện thoại khi người dùng bấm `"Vào quán"`

- **Vị trí:** `src/ui/Landing.jsx`, `src/ui/gameHud.css`, `src/ui/laptop/laptop.css`.
- **Hiện tượng:** Landing trên điện thoại rất đẹp và cho bấm `"Vào quán"` bình thường, nhưng vào trong quán thì hai cụm HUD trái/phải đè chồng lên nhau, không đi lại bằng bàn phím được (chỉ bấm sàn được), và khi mở Laptop thì `.laptop` bị ép theo `aspect-ratio: 16 / 10` thành khung nhỏ `335×210px` làm vỡ toàn bộ thanh tab và cắt mất đồng hồ Pomodoro.
- **Đề xuất khắc phục ngắn hạn (trước khi làm bản Mobile ở Giai đoạn 3):**
  - Bỏ `aspect-ratio: 16 / 10` trên màn hình `< 860px` (cho phép `.laptop` cao `82vh` để dùng được Pomodoro/To-do), và cho phép cuộn ngang thanh `.laptop-bar__apps`.
  - Hoặc hiện thông báo nhẹ ở Landing trên màn hình cảm ứng nhỏ nhắc người dùng mở bằng máy tính / xoay ngang màn hình để có trải nghiệm tốt nhất.

---

### Ưu tiên Thấp / Nội dung & Bảo mật nâng cao (Low)

- **`CONTENT-01` (Nội dung Landing lỗi thời):** Trong `src/ui/Landing.jsx` (dòng 61) và `src/locales/{vi,en}/common.json` (dòng 24–27), cần xoá cờ `soon: true` ("Sắp có") ở mục _"Ngồi cạnh nhau"_ và sửa lại câu _"không chat, không camera"_ thành _"có chat nhẹ nhàng, không voice, không camera"_ cho đúng thực tế. Thêm khoảng trắng trước `<span className="pill">` để trình đọc màn hình không đọc dính chữ.
- **`UX-01` (Phím `H` khi gập laptop):** Khi người dùng đã lưu link YouTube nhưng đang gập laptop mà bấm `H`, nên hiện thông báo gợi ý _"Đang đeo tai nghe · mở laptop để phát nhạc riêng"_ để người dùng hiểu vì sao nhạc YouTube chưa kêu.
- **`PERF-02` (Gói JS & huỷ tải tài nguyên lúc chuyển màn nhanh):** Gói `useRoomEnvironmentMap` nặng `1,05 MB` (chứa toàn bộ `three` core). Ngoài ra khi người dùng bấm vào quán ngay lúc video nền đang tải, trình duyệt huỷ ngang request video/prefetch (`net::ERR_ABORTED`) — không gây lỗi nhưng có thể trì hoãn tải video vài trăm ms hoặc dùng `preload="metadata"` khi mạng chậm.
- **`SEC-01` (Xác thực định danh gói Broadcast Supabase):** Trong `src/net/transport/supabaseTransport.js`, gói broadcast `chat` và `move` tin tưởng trường `payload.id` từ client. Trước khi quảng bá rộng rãi công khai (Sprint 3), nên kết hợp Supabase Auth hoặc kiểm tra đối chiếu với danh sách `presenceState()` đang hoạt động để hạn chế giả mạo tên/ID người khác trong phòng.

---

## 4. Checklist Kiểm thử Hồi quy Thủ công (Dành cho đợt test nhóm 3–5 bạn)

Dùng bảng kiểm nhanh dưới đây khi nhờ bạn bè test thử trên máy thật và mạng thật (`https://chilly-coffee.pages.dev`):

- [ ] **Âm thanh lần đầu:** Mở web bằng Chrome, Edge, Safari/Firefox → bấm `"Vào quán"` → xác nhận nhạc đài phát và tiếng phố/mưa phát ngay không bị trình duyệt chặn im lặng.
- [ ] **Độ lệch đài Radio giữa 2 máy:** Mở quán trên 2 máy tính khác nhau (cố tình chỉnh đồng hồ 1 máy lệch 5 phút) → tắt tai nghe → kiểm tra cả 2 máy phát cùng bài, lệch nhau dưới `2,5 giây`.
- [ ] **Đồng bộ nhiều người & tranh ghế:** 2 người cùng vào 1 mã phòng riêng (`?room=...`) → đi quanh quán thấy nhau mượt, thấy biểu tượng tai nghe & trạng thái `"Đang tập trung"` trên đầu → thử bấm ngồi vào cùng 1 ghế cùng lúc xem người đến sau có tự đứng dậy kèm thông báo không.
- [ ] **Thông báo hết giờ Pomodoro khi ẩn tab:** Chỉnh Pomodoro tập trung `1 phút`, bấm `Bắt đầu`, cho phép quyền thông báo trình duyệt, chuyển sang tab khác làm việc → đợi hết 1 phút xem có nhận được thông báo hệ thống và tự chuyển sang giờ nghỉ không.
- [ ] **Thử thách YouTube thực tế:** Dán lần lượt (1) link video thường, (2) link livestream lofi 24/7, (3) link playlist công khai `PL...`, (4) link có kèm trình chặn quảng cáo (uBlock/Brave) → kiểm tra thông báo hướng dẫn khi bị chặn hoặc video tắt nhúng.
- [ ] **Kiểm tra FPS trên laptop mỏng nhẹ (GPU tích hợp):** Ngồi làm việc liên tục 30 phút ở cả chế độ thường và `Chế độ nhẹ`, theo dõi độ mượt khi xoay camera và nhiệt độ quạt máy.
