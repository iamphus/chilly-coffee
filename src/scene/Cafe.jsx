import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import cafeUrl from '../../assets/cafe/cafe.glb?url'

const CEILING = /^Tran/

/** Mô hình quán (assets/cafe/cafe.glb). Ẩn trần khi nhìn từ trên xuống. */
export default function Cafe({ showCeiling = false }) {
  const { scene } = useGLTF(cafeUrl)
  const invalidate = useThree((state) => state.invalidate)

  useLayoutEffect(() => {
    scene.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = ![object.material].flat().some((m) => m.transparent)
        object.receiveShadow = true
      }
      if (CEILING.test(object.name)) object.visible = showCeiling
    })
    invalidate() // frameloop="demand": phải báo vẽ lại sau khi đổi cảnh
  }, [scene, showCeiling, invalidate])

  return <primitive object={scene} />
}

useGLTF.preload(cafeUrl)
