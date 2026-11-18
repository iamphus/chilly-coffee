import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AnimationClip, AnimationMixer } from 'three'
import { getCustomCharacter } from './customCharacter.js'

/**
 * Hiển thị một nhân vật chibi từ cấu hình `appearance` (tóc, áo, quần, màu sắc, phụ kiện) kèm hoạt ảnh.
 */
export default function CustomCharacter({ appearance, clip, timeScale = 1, startTime = 0, ref, ...groupProps }) {
  const { scene, animations } = useMemo(() => getCustomCharacter(appearance, appearance?.base), [appearance])

  const model = useMemo(() => {
    const copy = scene.clone(true)
    copy.traverse((object) => {
      if (object.isMesh) object.castShadow = true
    })
    return copy
  }, [scene])

  const mixer = useRef(null)

  useEffect(() => {
    const animationMixer = new AnimationMixer(model)
    const found = AnimationClip.findByName(animations, clip) ?? animations[0]
    if (found) {
      const action = animationMixer.clipAction(found)
      action.timeScale = timeScale
      action.play()
      action.time = startTime
    }
    mixer.current = animationMixer
    return () => {
      animationMixer.stopAllAction()
      animationMixer.uncacheRoot(model)
      mixer.current = null
    }
  }, [model, animations, clip, timeScale, startTime])

  useFrame((_, delta) => mixer.current?.update(Math.min(delta, 0.1)))

  return (
    <group ref={ref} {...groupProps}>
      <primitive object={model} />
    </group>
  )
}
