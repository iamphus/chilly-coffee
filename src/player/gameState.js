// Trạng thái nhân vật người chơi, dùng chung giữa Player (di chuyển) và ThirdPersonCamera.
// Là object thường đựng trong useRef (thay đổi mỗi khung hình), không đưa vào Zustand để khỏi render lại React.
import { Vector3 } from 'three'

// Xuất hiện ở góc phố đầu hẻm, quay mặt về phía cửa chính (x ≈ −4,2; z ≈ −0,5).
// Không đặt sát cửa vì hẻm hẹp (~2,5 m), camera sau lưng sẽ bị tường nhà bên cạnh ép sát vào.
const DOOR = [-4.2, -0.5]
const SPAWN_AT = [-6.6, 0, 3.8]
export const SPAWN = {
  position: SPAWN_AT,
  yaw: Math.atan2(DOOR[0] - SPAWN_AT[0], DOOR[1] - SPAWN_AT[2]),
}

export function createGameState() {
  return {
    position: new Vector3(...SPAWN.position),
    yaw: SPAWN.yaw, // hướng mặt: (sin yaw, cos yaw) trên mặt phẳng xz
    height: 1, // chiều cao nhân vật (m), Player đo lại từ mô hình
    moving: false, // đang đi (để camera tự về sau lưng)
    cameraYaw: SPAWN.yaw + Math.PI, // camera đang ở hướng nào so với nhân vật (Player dùng ở chế độ xoay tự do)
    cameraDistance: 3, // khoảng cách camera thật (m); quá gần thì Player ẩn nhân vật cho khỏi che màn hình
  }
}

/** Đưa góc `current` về gần `target` theo hằng số thời gian `tau` giây (đi đường ngắn nhất quanh vòng tròn). */
export function dampAngle(current, target, tau, dt) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current))
  return target - delta * Math.exp(-dt / tau)
}

/** Đưa `current` về gần `target` theo hằng số thời gian `tau` giây. */
export function damp(current, target, tau, dt) {
  return target + (current - target) * Math.exp(-dt / tau)
}
