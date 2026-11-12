# Kế hoạch dự án: Chilly Coffee – Quán cafe 3D để làm việc chill

Nov 11, 2026 · @NgTiens

## Tổng quan và mục tiêu

Chilly Coffee là một website hình quán cafe 3D phong cách cozy low-poly. Mỗi người vào quán là một nhân vật, ngồi vào một bàn làm việc riêng và cùng "ngồi cạnh nhau" để tập trung học, làm việc.

Mục tiêu chính:

- Tạo cảm giác ngồi quán cafe thật: ánh đèn ấm, tiếng mưa, nhạc quán, có người khác cùng làm việc.
- Mỗi người có góc riêng: laptop với Pomodoro, to-do, ghi chú và playlist nhạc của mình.
- Nhẹ, chạy mượt trên laptop sinh viên, mở bằng trình duyệt, không cần cài đặt.
- Đúng luật: tuân thủ chính sách YouTube, chỉ dùng nhạc và asset có giấy phép rõ ràng.

> **Nguyên tắc:** làm bản một người chơi trước, chạy ổn rồi mới thêm nhiều người. Không có voice hay camera, chỉ hiện diện cùng nhau (body doubling). Bản 1 và 2 chỉ hỗ trợ máy tính; bản cho điện thoại để giai đoạn 3 vì cảnh 3D và giao diện laptop trên màn hình nhỏ là bài toán riêng.

## Trải nghiệm người dùng

Người dùng đi qua 5 bước, từ lúc mở web đến lúc tập trung làm việc.

1. **Vào quán:** mở web, thấy cảnh quán cafe, TV quán đang phát nhạc, tiếng mưa ngoài cửa kính. Bấm nút "Vào quán" một lần (trình duyệt yêu cầu thao tác này mới cho phát âm thanh).
2. **Chọn bàn:** click vào một bàn trống. Bàn đã có người sẽ hiện nhân vật đang ngồi (từ bản 2).
3. **Ngồi xuống, mở laptop:** camera zoom vào góc bàn, màn hình laptop trở thành khu làm việc gồm:
   - Pomodoro (mặc định 25 phút làm / 5 phút nghỉ, chỉnh được)
   - To-do và ghi chú nhanh
   - Trình phát YouTube với playlist riêng (dán link một lần, web lưu lại)
   - Ô nhỏ "Nhạc quán" để nghe TV quán khi đang ngồi bàn
4. **Đeo hoặc tháo tai nghe:** một nút chuyển giữa nhạc riêng và nhạc quán (chi tiết ở phần Thiết kế âm thanh).
5. **Rời bàn:** đứng dậy để đi dạo quanh quán hoặc đổi bàn. To-do và playlist vẫn được giữ cho lần sau.

Từ bản 2, trên đầu mỗi nhân vật có trạng thái nhỏ: Đang tập trung, Nghỉ giải lao, hoặc số Pomodoro đã xong. Nhân vật đeo tai nghe là tín hiệu "đừng làm phiền".

## Thiết kế âm thanh

TV quán phát nhạc chung tự host, laptop phát playlist YouTube riêng, nút tai nghe quyết định người dùng đang nghe nguồn nào.

| Trạng thái | TV quán (nhạc tự host) | Laptop riêng (YouTube) | Âm thanh nền quán |
|---|---|---|---|
| Đeo tai nghe | Tắt tiếng (vẫn chạy ngầm để giữ đồng bộ) | Phát playlist riêng | Nhỏ lại và trầm đi, như bị tai nghe chắn |
| Không đeo | Phát bình thường | Dừng hẳn | Bình thường |

### TV quán: nhạc tự host, đồng bộ theo đồng hồ

- Danh sách 10–20 bài lofi có giấy phép CC0 hoặc CC BY, khoảng 1 tiếng nhạc, phát lặp theo kiểu radio.
- Đồng bộ không cần server: coi playlist là một đài đã phát từ một mốc cố định. Mỗi máy tự tính (giờ hiện tại − mốc) chia lấy dư cho tổng thời lượng, ra được bài đang phát và giây thứ mấy.
- Lấy giờ chuẩn bằng cách đọc header `Date` trong phản hồi HTTP của chính trang web (mọi host tĩnh đều trả sẵn, không cần viết server) để tránh đồng hồ máy lệch. Cứ khoảng 30 giây kiểm tra lại, lệch quá 3 giây thì nhảy về đúng chỗ.
- Trên TV hiện dòng "Now playing: Tên bài – Tác giả" để ghi công tác giả cho nhạc CC BY.

### Laptop riêng: YouTube IFrame Player API

- Trình phát luôn hiển thị trên màn hình laptop, tối thiểu 200×200px, giữ nguyên logo, nút điều khiển và quảng cáo.
- Khi thoát chế độ ngồi bàn thì tạm dừng, không để phát khi trình phát bị khuất.

### Chuyển trạng thái

- Tăng giảm âm lượng từ từ trong khoảng 1 giây (crossfade), không cắt ngang.
- Hiệu ứng tai nghe dùng Web Audio API (giảm âm lượng + bộ lọc low-pass). Chỉ làm được với âm thanh tự host, không làm được với iframe YouTube.
- Âm thanh nền (mưa, máy pha cà phê, cốc chén) là file CC0 tự host, có thanh trượt âm lượng riêng.

## Công nghệ và kiến trúc

Đã chốt phương án React + React Three Fiber (lớp viết code bên trên Three.js), viết bằng JavaScript, dựng bằng Vite. Bản 1 chỉ cần host tĩnh, server realtime chỉ thêm vào từ bản 2.

| Phần | Công nghệ | Dùng từ |
|---|---|---|
| Khung dự án | Vite + React, viết bằng JavaScript | Bản 1 |
| Cảnh 3D | React Three Fiber + drei (camera, ánh sáng, nhúng HTML vào TV và laptop) | Bản 1 |
| Trạng thái chung | Zustand (bàn đang ngồi, tai nghe, trang phục) | Bản 1 |
| Mô hình quán, đồ vật | Asset CC0 của Kenney, Quaternius; chỉnh thêm bằng Blender | Bản 1 |
| Nhân vật | Chibi tự dựng bằng code, tóc và trang phục rời, gộp thành 1–2 khối khi tạo; sau này có thể nặn lại bằng Blender + Mixamo | Bản 1 |
| Giao diện laptop | Component React phủ lên cảnh 3D | Bản 1 |
| Nhạc TV quán, âm thanh nền | File mp3 tự host + Web Audio API | Bản 1 |
| Nhạc riêng | YouTube IFrame Player API | Bản 1 |
| Lưu to-do, playlist | localStorage (bản 1), chuyển sang Supabase khi có tài khoản | Bản 1 |
| Host web | Cloudflare Pages (không tính băng thông); file nhạc có thể để trên Cloudflare R2 | Bản 1 |
| Đăng nhập, cơ sở dữ liệu | Supabase | Bản 2 |
| Đồng bộ nhiều người | Supabase Realtime | Bản 2 |

Code chia thành các component nhỏ, mỗi file một việc, để dễ sửa và chỉ cần đưa Claude đúng file liên quan:

- `scene/`: `Cafe.jsx` (quán, ánh sáng, mưa), `Desk.jsx`, `Tv.jsx`
- `characters/`: `Character.jsx`, `hair.js`, `outfits.js`
- `ui/`: `Laptop.jsx` (Pomodoro, to-do, ghi chú, YouTube), `Settings.jsx` (âm lượng, chế độ nhẹ)
- `audio/`: `radio.js` (nhạc TV đồng bộ đồng hồ), `ambience.js`, `headphones.js`
- `store.js`: trạng thái chung (Zustand)

Mọi thứ chạy trong trình duyệt; Supabase chỉ cần khi có nhiều người cùng vào quán.

## Hiệu năng

Mục tiêu là 60fps trên laptop tầm trung (Intel Iris Xe hoặc Radeon tích hợp, RAM 8–16GB); máy cũ khoảng 2018–2020 chạy được ở chế độ nhẹ. Đây là ước lượng, phải kiểm chứng trên máy thật ở giai đoạn 1.

| Chỉ tiêu | Ngân sách |
|---|---|
| Draw calls mỗi khung hình | Dưới khoảng 150 |
| Số tam giác | Dưới khoảng 300 nghìn |
| Tài nguyên 3D tải về | Dưới 15MB |
| Nguồn sáng đổ bóng | 1 |
| Tỷ lệ điểm ảnh | Tối đa 1,5 |

Cách giữ ngân sách:

- Gộp mỗi nhân vật thành 1–2 khối khi tạo. Không gộp thì 20 người trong quán có thể lên khoảng 1.000 draw calls.
- Dùng instancing cho đồ lặp lại: giọt mưa, cốc chén, cây.
- Chỉ vẽ khi cần (`frameloop="demand"`); giảm còn 30fps khi người dùng đang ngồi nhìn laptop, dừng khi ẩn tab.
- Chỉ một trình phát YouTube chạy cùng lúc.
- Không bật hiệu ứng hậu kỳ nặng (bloom, ambient occlusion) mặc định.

**Chế độ nhẹ** (nút trong cài đặt): tắt bóng, độ phân giải 1×, giảm hạt mưa, khóa 30fps.

## Lộ trình theo giai đoạn

Dự án chia thành 4 giai đoạn. Mỗi giai đoạn phải đạt điều kiện hoàn thành rồi mới sang giai đoạn sau. Thời gian là ước tính khi làm bán thời gian song song với việc học. Giai đoạn 1 là trọng tâm hiện tại.

### Giai đoạn 0 – Chuẩn bị (khoảng 1 tuần)

- [x] Gom ảnh và video quán tham khảo (đã có 12 ảnh + 2 video)
- [x] Mô hình 3D quán: tự dựng, có sân vườn và phòng lớn, 28 chỗ ngồi (thay cho việc tìm bộ nội thất CC0)
- [x] Bộ 12 nhân vật chibi kèm 6 hoạt ảnh, mỗi nhân vật một file GLB
- [ ] Cài Node.js (bản LTS), VS Code, Git
- [ ] Tạo tài khoản GitHub và Cloudflare; tạo repo chilly-coffee
- [ ] Chọn 10–20 bài lofi CC0 hoặc CC BY, ghi link và giấy phép từng bài vào một bảng
- [ ] Tìm âm thanh nền CC0: mưa, máy pha cà phê, cốc chén, tiếng mèo
- [ ] Nhắn xin phép chủ quán gốc vì bố cục quán dựa trên một quán thật
- [ ] Kiểm tra tên miền Chilly Coffee còn trống không (chưa cần mua)
- [ ] Lập danh sách 3–5 bạn sẽ dùng thử

### Giai đoạn 1 – Bản 1, một người (khoảng 2–3 tuần)

- [ ] Tạo khung dự án Vite + React + React Three Fiber, đưa lên Cloudflare Pages
- [ ] Dựng cảnh quán: ánh sáng ấm, cửa kính có mưa, bàn ghế, TV
- [ ] Nhân vật chibi: 5 kiểu tóc, 5 bộ đồ, chọn màu; gộp thành 1–2 khối mỗi nhân vật
- [ ] Click chọn bàn, camera zoom vào laptop
- [ ] Giao diện laptop: Pomodoro, to-do, ghi chú
- [ ] Pomodoro gửi thông báo trình duyệt khi hết giờ
- [ ] Trình phát YouTube cho playlist riêng
- [ ] TV quán phát nhạc tự host, đồng bộ theo đồng hồ
- [ ] Nút tai nghe + crossfade + hiệu ứng lọc tiếng
- [ ] Chế độ nhẹ; giảm fps khi ngồi bàn hoặc ẩn tab
- [ ] Trang chính sách riêng tư (YouTube yêu cầu với trang nhúng)
- [ ] Đưa lên mạng, nhờ 3–5 bạn dùng thử và góp ý

**Điều kiện hoàn thành:** tải lần đầu dưới 5 giây trên mạng 4G, tổng tài nguyên 3D dưới 15MB, giữ 60fps trên laptop dùng đồ họa tích hợp, nhạc TV lệch dưới 2 giây giữa 2 máy mở cùng lúc.

### Giai đoạn 2 – Bản 2, nhiều người (khoảng 3–4 tuần)

- [ ] Đăng nhập bằng Supabase, lưu to-do và playlist theo tài khoản
- [ ] Server realtime: đồng bộ vị trí, chỗ ngồi, trạng thái
- [ ] Hiện nhân vật người khác, trạng thái trên đầu, tai nghe khi đang đeo
- [ ] Giới hạn số người mỗi phòng, tự mở phòng mới khi đầy

**Điều kiện hoàn thành:** một nhóm bạn ngồi cùng quán trọn một buổi học không lỗi.

### Giai đoạn 3 – Mở rộng (làm dần)

- [ ] Chọn và tùy chỉnh nhân vật
- [ ] Thêm phòng: thư viện, ban công mưa
- [ ] Phòng riêng cho nhóm bạn (vào bằng link mời)
- [ ] Vote bài cho TV quán
- [ ] Thống kê Pomodoro cá nhân theo tuần
- [ ] Bản cho điện thoại (giao diện laptop thu gọn, cảnh 3D nhẹ hơn)

## Lưu ý chính sách YouTube và giấy phép nhạc

Nhúng YouTube được phép nếu dùng trình phát chính thức và để nó hiển thị rõ. Nhạc tự host chỉ được dùng khi có giấy phép cho phép.

**YouTube: được làm**

- Nhúng bằng iframe hoặc IFrame Player API chính thức.
- Chỉnh âm lượng, phát, dừng, chuyển bài qua API.
- Chỉ nhúng được video mà chủ kênh cho phép nhúng.

**YouTube: không được làm**

- Giấu trình phát hoặc làm nhỏ hơn 200×200px để chỉ lấy tiếng.
- Tách riêng phần âm thanh, tải nhạc về.
- Cho phát khi cửa sổ đã đóng hoặc thu nhỏ.
- Che logo, nút điều khiển, hoặc chặn quảng cáo.
- Tự động phát khi trình phát chưa hiện quá nửa trên màn hình, hoặc có hơn một trình phát tự động phát cùng lúc.

### Giấy phép nhạc tự host

| Giấy phép | Dùng cho web này | Điều kiện |
|---|---|---|
| CC0 | Được | Không cần ghi tên |
| CC BY | Được | Ghi tên tác giả (dòng "Now playing" trên TV) |
| CC BY-NC | Không dùng (Chilly Coffee có thể kiếm tiền sau này) | Ghi tên; bỏ nếu sau này gắn quảng cáo hoặc thu phí |
| Nhạc "nghe miễn phí" trên YouTube, Spotify | Không | Nghe miễn phí không có nghĩa là được đưa lên web |

Nguồn tìm nhạc: Free Music Archive (lọc theo giấy phép CC), Pixabay Music. Đọc điều khoản của từng trang và lưu lại giấy phép của từng bài. Thận trọng với các kênh "No Copyright Music": nhiều kênh chỉ cho dùng trong video.

Nguồn: YouTube API Services – Required Minimum Functionality, Complying with YouTube's Developer Policies, Embed videos & playlists – YouTube Help.

## Chi phí và cách dùng Claude Pro hiệu quả

Bản 1 và bản 2 có thể chạy hoàn toàn bằng gói miễn phí. Tài khoản Claude Pro đủ dùng nếu chia việc nhỏ. Người dùng vào web không tốn lượt Claude.

| Khoản | Chi phí | Ghi chú |
|---|---|---|
| Host web (Cloudflare Pages) | Gói miễn phí | Chọn Cloudflare vì không tính băng thông: mỗi người ngồi 1 tiếng tải khoảng 50MB nhạc, Netlify hay GitHub Pages sẽ vượt giới hạn nhanh |
| Supabase (đăng nhập, dữ liệu, realtime) | Gói miễn phí | Kiểm tra giới hạn gói khi số người dùng tăng |
| Asset 3D, nhạc, âm thanh | Miễn phí | CC0 / CC BY |
| Tên miền riêng | Tùy chọn, trả theo năm | Không bắt buộc, dùng tên miền miễn phí của nơi host cũng được |
| Claude Pro | Đang có | Giới hạn theo phiên 5 tiếng và theo tuần |

### Mẹo để Claude Pro đủ dùng

- Mỗi nhiệm vụ một chat mới (ví dụ: "dựng cảnh quán", "thêm Pomodoro"). Chat càng dài, mỗi tin nhắn càng tốn.
- Chỉ đưa file liên quan khi sửa, không dán lại toàn bộ code.
- Yêu cầu cụ thể, có số liệu ("đèn vàng ấm, giảm sáng 30%") thay vì "làm đẹp hơn".
- Dùng Sonnet cho sửa lặt vặt, Opus cho kiến trúc và phần đồng bộ nhiều người.
- Theo dõi lượt còn lại ở Settings > Usage. Hết lượt thì đợi reset, hoặc bật usage credits khi cần gấp.

## Rủi ro và việc cần chốt

Rủi ro lớn nhất là làm quá nhiều cùng lúc; giữ đúng thứ tự giai đoạn là cách phòng chính.

| Rủi ro | Cách xử lý |
|---|---|
| Cảnh 3D nặng, giật trên laptop yếu | Phong cách low-poly, ít đèn thật, nén mô hình, có nút giảm đồ họa |
| Video YouTube bị xóa hoặc tắt nhúng | Tự bỏ qua, chuyển bài kế tiếp, báo nhẹ cho người dùng |
| Nhạc TV bị lệch giữa các máy | Lấy giờ chuẩn từ server, kiểm tra lại định kỳ và tự nhảy về đúng chỗ |
| Trình duyệt chặn tự phát âm thanh | Nút "Vào quán" bắt buộc bấm một lần |
| Vi phạm giấy phép nhạc hoặc asset | Chỉ dùng CC0 / CC BY, lưu bảng giấy phép từng file |
| Người lạ quấy rối khi mở công khai | Không có chat tự do ở bản 2; thêm phòng riêng bằng link mời |
| Hết lượt Claude giữa chừng | Chia nhiệm vụ nhỏ, lưu code trên GitHub sau mỗi bước |

### Quyết định đã chốt

- **Tên dự án:** Chilly Coffee
- **Phong cách:** cozy low-poly, nhân vật chibi đầu tròn
- **Miễn phí** cho mọi người dùng giai đoạn đầu; có thể kiếm tiền sau nên chỉ dùng nhạc và asset CC0 / CC BY, không dùng CC BY-NC
- **Mở công khai** cho mọi người
- **Công nghệ:** React + React Three Fiber + drei + Zustand, viết bằng JavaScript, dựng bằng Vite, host trên Cloudflare Pages
