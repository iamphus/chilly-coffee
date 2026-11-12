import { Box3, Vector3 } from 'three'

// Mô hình quán có 2 tấm ảnh phẳng làm "nhà đối diện" (bên kia đường và bên kia hẻm), gộp thành một khối
// cao ~6 m, dài ~24 m. Khung cảnh mới (src/scene/surroundings/) thay cho chúng nên phải ẩn đi,
// và bỏ khỏi va chạm camera (nếu không camera đụng phải bức tường vô hình).
const size = new Vector3()

export function isBackdropWall(mesh) {
  new Box3().setFromObject(mesh).getSize(size)
  return size.y > 5 && Math.max(size.x, size.z) > 20
}

// Cây cũ trong cafe.glb (thân ống + tán là các khối cầu) được thay bằng cây sinh bằng code
// (src/scene/trees/, trồng lại đúng chỗ trong surroundings/layout.js). Mô hình gộp khối theo vật liệu,
// nên nhận ra bằng màu: vỏ cây BARK 0x5a4232 và 2 màu tán CANOPY 0x2c5f28 / CANOPY2 0x3f7633 trong buildCafe.js
// (bản r149 lưu mã màu như giá trị tuyến tính nên so trực tiếp được).
const LEGACY_TREE_COLORS = [0x5a4232, 0x2c5f28, 0x3f7633].map((hex) => [(hex >> 16) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255])

export function isLegacyTree(mesh) {
  const { color } = [mesh.material].flat()[0]
  if (!color) return false
  return LEGACY_TREE_COLORS.some(([r, g, b]) => Math.abs(color.r - r) + Math.abs(color.g - g) + Math.abs(color.b - b) < 0.01)
}
