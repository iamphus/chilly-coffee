import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { PMREMGenerator } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/** Bản đồ phản chiếu dựng từ RoomEnvironment của three, không cần tải file ngoài. */
export function useRoomEnvironmentMap() {
  const gl = useThree((state) => state.gl)

  const envMap = useMemo(() => {
    const pmrem = new PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const texture = pmrem.fromScene(room, 0.04).texture
    room.dispose()
    pmrem.dispose()
    return texture
  }, [gl])

  useEffect(() => () => envMap.dispose(), [envMap])

  return envMap
}
