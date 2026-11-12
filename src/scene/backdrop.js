import { Box3, Vector3 } from 'three'

// Mô hình quán có 2 tấm ảnh phẳng làm "nhà đối diện" (bên kia đường và bên kia hẻm), gộp thành một khối
// cao ~6 m, dài ~24 m. Khung cảnh mới (src/scene/surroundings/) thay cho chúng nên phải ẩn đi,
// và bỏ khỏi va chạm camera (nếu không camera đụng phải bức tường vô hình).
const size = new Vector3()

export function isBackdropWall(mesh) {
  new Box3().setFromObject(mesh).getSize(size)
  return size.y > 5 && Math.max(size.x, size.z) > 20
}
