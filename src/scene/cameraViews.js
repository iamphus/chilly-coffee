import { Vector3 } from 'three'

export const VIEWS = {
  // Vừa vào quán: đứng ngoài phố nhìn vào mặt tiền (giống cảnh mở đầu video landing)
  street: { position: new Vector3(-9.5, 2.6, 13.5), target: new Vector3(-3.2, 1.5, 2.5) },
  // Sau khi vào quán: nhìn toàn cảnh từ trên cao (bỏ trần)
  overview: { position: new Vector3(-9, 15, 9), target: new Vector3(0, 0, -4.5) },
}
