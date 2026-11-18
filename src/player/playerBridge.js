// Cầu nối nhẹ giữa nhân vật 3D (Player) và giao diện 2D ngoài Canvas (CafeMap):
// cập nhật toạ độ mỗi khung hình mà không gây render lại React, và nhận lệnh tự đi tới điểm / bàn.
import { SPAWN } from './gameState.js'

export const playerBridge = {
  x: SPAWN.position[0],
  z: SPAWN.position[2],
  yaw: SPAWN.yaw,
  walkTo: null, // (tx, tz, seatName?) => boolean
}
