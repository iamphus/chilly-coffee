// Vị trí bảng tên trên màn hình (px), Player cập nhật mỗi khung hình, NameTag (DOM) đọc để đặt theo.
// Không dùng drei <Html> vì nó tạo React root riêng, dễ lỗi khi cảnh bị Suspense giữ lại lúc biên dịch shader.
export const nameTagAnchor = { x: 0, y: 0, visible: false }
