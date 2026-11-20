import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import cafeUrl from '../../assets/cafe/cafe.glb?url'
import { isBackdropWall } from './backdrop.js'

const CEILING = /^Tran/
const SKIP_SHADOW = /san|floor|tran|ceiling|tranh|dia|tach|coc|ly|muong|binh|chai|sach|hop|bong_den|menu|giay|napkin|rem|cushion|khung|bien_hieu|anh_cu/i

/** Mô hình quán (assets/cafe/cafe.glb). Ẩn trần khi nhìn từ trên xuống. */
export default function Cafe({ showCeiling = false }) {
  const { scene } = useGLTF(cafeUrl)
  const invalidate = useThree((state) => state.invalidate)

  useLayoutEffect(() => {
    scene.traverse((object) => {
      if (object.isMesh) {
        const isTransparent = [object.material].flat().some((m) => m.transparent)
        const name = object.name || ''
        const skip = SKIP_SHADOW.test(name) || CEILING.test(name)

        let isSmall = false
        if (object.geometry) {
          if (!object.geometry.boundingSphere) object.geometry.computeBoundingSphere()
          const r = object.geometry.boundingSphere?.radius
          if (r !== undefined && r < 1.0) {
            isSmall = true
          }
        }

        object.castShadow = !isTransparent && !skip && !isSmall
        object.receiveShadow = !CEILING.test(name)
        if (isBackdropWall(object)) object.visible = false // thay bằng công viên (Surroundings)
      }
      if (CEILING.test(object.name)) object.visible = showCeiling
    })
    invalidate() // frameloop="demand": phải báo vẽ lại sau khi đổi cảnh
  }, [scene, showCeiling, invalidate])

  return <primitive object={scene} />
}

useGLTF.preload(cafeUrl)
