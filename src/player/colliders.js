// Va chạm với mô hình quán bằng tia (raycast), tăng tốc bằng three-mesh-bvh:
// - độ cao sàn dưới chân nhân vật (đi lên bậc thềm, bậc thang)
// - camera không xuyên tường: tia từ đầu nhân vật tới camera
// - bấm lên sàn: tìm điểm nhân vật cần đi tới
import { Box3, Raycaster, Vector3 } from 'three'
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh'
import { isBackdropWall, isLegacyTree } from '../scene/backdrop.js'

const STEP_UP = 0.45 // bắn tia từ cao hơn chân bao nhiêu mét: bậc cao nhất có thể bước lên
const MAX_DROP = 1.2 // nhìn xuống sâu nhất bao nhiêu mét
const MIN_FLOOR_NORMAL_Y = 0.6 // mặt nghiêng hơn thế này không tính là sàn

// Camera chỉ va với "kết cấu" (tường, kệ cao, sàn, trần, cây ngoài phố); bàn ghế, quầy, chậu cây
// thì camera đi xuyên qua, nếu không camera cứ giật sát vào lưng mỗi khi có cái ghế phía sau.
// Mô hình gộp khối theo vật liệu nên không có tên để lọc, phân loại theo kích thước khối.
const STRUCTURE_MIN_HEIGHT = 1.6 // m: khối cao từ mức này trở lên (tường, kệ sách, tủ)
const STRUCTURE_MIN_SPAN = 3 // m: khối phẳng rộng từ mức này trở lên (sàn, trần)
const FLAT_MAX_HEIGHT = 0.3

const size = new Vector3()
function isStructure(mesh) {
  new Box3().setFromObject(mesh).getSize(size)
  const span = Math.max(size.x, size.z)
  return size.y >= STRUCTURE_MIN_HEIGHT || (span >= STRUCTURE_MIN_SPAN && size.y <= FLAT_MAX_HEIGHT)
}

const DOWN = new Vector3(0, -1, 0)

export function createColliders(cafe) {
  cafe.updateMatrixWorld(true)

  // Kính và vật trong suốt không chặn camera, cũng không phải sàn
  const meshes = []
  cafe.traverse((object) => {
    if (!object.isMesh) return
    if ([object.material].flat().some((material) => material.transparent)) return
    if (isBackdropWall(object) || isLegacyTree(object)) return // nhà đối diện và cây cũ, đã ẩn
    if (!object.geometry.boundsTree) object.geometry.boundsTree = new MeshBVH(object.geometry)
    object.raycast = acceleratedRaycast
    meshes.push(object)
  })
  const cameraMeshes = meshes.filter(isStructure)

  const raycaster = new Raycaster()
  raycaster.firstHitOnly = true
  const origin = new Vector3()
  const normal = new Vector3()

  const firstHit = (targets = meshes) => raycaster.intersectObjects(targets, false)[0]
  const worldNormalY = (hit) => normal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld).y

  return {
    meshes,

    /** Độ cao sàn tại (x, z) gần độ cao hiện tại `y`; null nếu không có sàn. */
    floorHeight(x, z, y) {
      raycaster.set(origin.set(x, y + STEP_UP, z), DOWN)
      raycaster.far = STEP_UP + MAX_DROP
      const hit = firstHit()
      if (!hit || worldNormalY(hit) < MIN_FLOOR_NORMAL_Y) return null
      return hit.point.y
    },

    /** Khoảng cách tới tường/kết cấu đầu tiên trên tia từ `from` theo hướng `direction` (đã chuẩn hoá). */
    obstacleDistance(from, direction, maxDistance) {
      raycaster.set(from, direction)
      raycaster.far = maxDistance
      const hit = firstHit(cameraMeshes)
      return hit ? hit.distance : Infinity
    },

    /** Điểm trên sàn mà người dùng bấm vào (raycaster đã setFromCamera); null nếu bấm vào tường/vật. */
    pickFloor(pointerRaycaster) {
      pointerRaycaster.firstHitOnly = true
      const hit = pointerRaycaster.intersectObjects(meshes, false)[0]
      if (!hit || worldNormalY(hit) < MIN_FLOOR_NORMAL_Y) return null
      return hit.point
    },
  }
}
