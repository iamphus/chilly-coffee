# Tham khảo: cách đi lại và giao diện kiểu sansatemple.com

Muốn Chilly Coffee có cảm giác đi lại giống trang https://sansatemple.com (ngôi chùa 3D, nhân vật chibi đi trong sân). Chỉ học cách làm và bố cục; không lấy tên, chữ, hình, mô hình hay âm thanh của trang đó.

Ảnh chụp tham khảo nằm trong thư mục `anh/`:
- `sansa_1s.jpg`: góc camera sau lưng, thanh nút hành động, góc trên trái và trên phải.
- `sansa_14s.jpg`: đang đi, có nút "ngồi nghỉ" hiện ra vì đứng gần ghế.
- `sansa_20s.jpg`: camera theo sau khi đi qua khúc cua, đèn và hạt lá bay.
- `sansa_30s.jpg`: leo bậc thang vào trong nhà, camera kéo gần lại.

Nếu có công cụ trình duyệt thì mở thẳng trang để xem: bấm vào sàn để đi, kéo chuột để nhìn quanh, lăn chuột để phóng to/thu nhỏ.

## 1. Camera góc nhìn thứ ba sau lưng (quan trọng nhất)

Đây là góc nhìn MẶC ĐỊNH: vào quán là thấy ngay sau lưng nhân vật, không có màn nhìn từ trên xuống, không có nút "Chơi thử". Bỏ camera cao nhìn từ trên xuống hiện tại (chỉ giữ lại nếu sau này cần nút "Bản đồ").

Camera khóa sau lưng như game góc nhìn thứ ba:

- Camera luôn nằm ngay sau lưng nhân vật, cao hơn đầu một chút, nhìn hơi chúc xuống khoảng 10–15°. Nhân vật nằm giữa màn hình, hơi thấp, cao khoảng 1/4 đến 1/3 chiều cao màn hình.
- Khoảng cách cố định khoảng 3–4 lần chiều cao nhân vật. FOV khoảng 50.
- Nhân vật quay hướng nào thì camera quay theo hướng đó, luôn giữ đúng sau lưng. Không để camera đứng yên một chỗ rồi nhân vật đi xa khỏi nó.
- Chuyển động camera mượt: vị trí và góc xoay đuổi theo bằng lerp/damping khoảng 0,1–0,2 giây, không giật, không lắc khi nhân vật dừng.
- Kéo chuột (giữ chuột trái hoặc phải): xoay camera quanh nhân vật để nhìn ngang dọc. Khi thả chuột ra và nhân vật bắt đầu đi, camera tự xoay về lại sau lưng trong khoảng 0,5 giây.
- Lăn chuột: phóng to/thu nhỏ trong một khoảng giới hạn; thả ra vẫn giữ mức zoom đã chọn.
- Camera không được xuyên tường: bắn tia từ đầu nhân vật tới camera, nếu chạm tường/vật thì kéo camera lại gần nhân vật; hết vướng thì từ từ lùi về khoảng cách cũ. Trong nhà trần thấp thì camera tự gần lại (xem `sansa_30s.jpg`).

## 2. Điều khiển (kiểu game)

- W / mũi tên lên: đi tới theo hướng nhân vật đang nhìn. S / mũi tên xuống: lùi chậm.
- A / D (mũi tên trái/phải): xoay nhân vật sang trái/phải, camera xoay theo vì đang khóa sau lưng.
- Shift: đi nhanh hơn (tuỳ chọn).
- Bấm lên sàn: nhân vật tự đi tới đó (giữ tìm đường đã có), hiện một vòng tròn nhỏ ở điểm đến; trên đường đi nhân vật quay mặt theo hướng đi và camera vẫn bám sau lưng.
- Đang tự đi mà bấm phím di chuyển thì huỷ đường tự đi, chuyển sang điều khiển bằng phím.
- Nhân vật bám theo độ cao sàn (đi được bậc thang, bậc thềm) và không đi xuyên tường, bàn ghế (dùng lưới đi lại đã có).
- Lúc mới vào, hiện một dòng gợi ý nhỏ ở giữa phía trên màn hình: "W A S D để đi · Bấm lên sàn để tới đó · Kéo chuột để nhìn quanh · Lăn chuột để phóng to/thu nhỏ", mờ dần sau vài giây.

## 2b. Nút chuyển chế độ camera

Có một nút để đổi qua lại giữa 2 chế độ camera. Mặc định là "Khóa sau lưng".

| | Khóa sau lưng (mặc định) | Xoay tự do |
|---|---|---|
| Camera | Luôn ở đúng sau lưng nhân vật, quay theo nhân vật | Ở yên góc người dùng đã xoay, chỉ đi theo vị trí nhân vật, không tự quay về sau lưng |
| Kéo chuột | Nhìn quanh tạm thời; thả ra và đi tiếp thì camera tự về sau lưng | Xoay camera quanh nhân vật và giữ nguyên góc đó |
| W / S | Đi tới / lùi theo hướng nhân vật | Đi ra xa / về phía camera (theo hướng camera đang nhìn) |
| A / D | Xoay nhân vật sang trái / phải | Đi ngang sang trái / phải so với camera; nhân vật tự quay mặt theo hướng đi |
| Bấm lên sàn | Tự đi tới đó, camera bám sau lưng | Tự đi tới đó, camera giữ góc đang xoay |

- Nút nằm ở góc trên phải, cạnh nút tắt tiếng và cài đặt: biểu tượng camera, đổi biểu tượng theo chế độ (ví dụ ổ khóa cho "Khóa sau lưng", mũi tên vòng cho "Xoay tự do"); di chuột vào hiện chữ tên chế độ.
- Phím tắt: V.
- Khi đổi chế độ, hiện thông báo nhỏ 2 giây ở giữa phía trên: "Camera: Khóa sau lưng" hoặc "Camera: Xoay tự do".
- Chuyển chế độ phải mượt: từ "Xoay tự do" sang "Khóa sau lưng" thì camera lướt về sau lưng trong khoảng 0,5 giây, không nhảy cái rụp.
- Nhớ chế độ đã chọn vào localStorage, lần sau vào quán dùng lại.
- Khi đang ngồi (góc nhìn thứ nhất với laptop) thì ẩn nút này; đứng dậy thì quay lại chế độ đang chọn.

## 3. Bảng tên trên đầu

- Một viên nhỏ nền trắng bo tròn trên đầu nhân vật: chấm tròn chữ "Tôi" + tên ngẫu nhiên tiếng Việt (ví dụ "Mây Chiều", "Gió Nhẹ").
- Luôn quay về phía camera, cỡ chữ gần như không đổi khi zoom.

## 4. Thanh hành động ở giữa đáy màn hình

- Một thanh bo tròn, nền tối trong mờ, có 4 nút (biểu tượng phía trên, chữ nhỏ phía dưới): Vẫy tay, Uống cà phê, Vươn vai, Ngáp.
- Bấm một nút thì nhân vật chạy hoạt ảnh đó; trong lúc chạy, nút đó đổi chữ thành "Dừng".
- Dùng các hoạt ảnh nhân vật đã có (Vay_Tay, Uong…); cái nào chưa có thì làm thêm.

## 5. Nút theo ngữ cảnh

- Khi nhân vật đứng gần một ghế trống (khoảng dưới 1,2 m), hiện một nút "Ngồi xuống" ngay phía trên thanh hành động (xem `sansa_14s.jpg`).
- Bấm thì ngồi vào ghế đó, rồi vào góc nhìn thứ nhất với laptop như bản thử hiện tại. Đứng dậy thì quay lại camera sau lưng.
- Sau này: gần quầy thì hiện "Gọi đồ".

## 6. Các góc màn hình

- Trên trái, một khung bo tròn: nút thoát, nút bản đồ, tên phòng "Chilly Coffee 02" có mũi tên chọn phòng (phòng nhiều người làm ở bản 2, bản 1 chỉ hiện tên).
- Trên phải: chấm màu nhân vật (bấm để đổi trang phục), nút chế độ camera (mục 2b), nút tắt tiếng, nút cài đặt; bên dưới một nút "Nhạc quán" bật/tắt.
- Tất cả nhỏ, gọn, chữ trắng trên nền tối mờ; giữa màn hình để trống cho cảnh 3D.

## 7. Không khí

- Đèn treo phát sáng ấm có quầng sáng (vật liệu phát sáng + bloom nhẹ, hoặc sprite quầng sáng giả để nhẹ máy).
- Vài hạt bay chậm (lá, bụi sáng, hoặc mưa ngoài cửa kính).
- Có người khác đi lại trong quán (bây giờ là NPC, bản 2 là người thật).

## Thứ tự làm

1. Camera sau lưng (mục 1) + điều khiển (mục 2) + nút chuyển chế độ camera (mục 2b).
2. Nút "Ngồi xuống" theo ngữ cảnh (mục 5).
3. Bảng tên (mục 3) và thanh hành động (mục 4).
4. Các góc màn hình (mục 6) và không khí (mục 7).

Mỗi bước làm xong thì chạy thử, chụp màn hình so với ảnh trong `anh/`, rồi mới sang bước sau.
