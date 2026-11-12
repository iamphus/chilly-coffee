import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { AnimationClip, AnimationMixer } from 'three'
import { CHARACTER_URLS } from './characterAssets.js'

/**
 * Một nhân vật chibi đang chạy một hoạt ảnh.
 * Nhân vật là các khối rời (không có xương) nên clone thường là đủ để dùng nhiều lần.
 */
export default function Character({ id, clip, timeScale = 1, startTime = 0, ref, ...groupProps }) {
  const { scene, animations } = useGLTF(CHARACTER_URLS[id])

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
    const action = animationMixer.clipAction(AnimationClip.findByName(animations, clip))
    action.timeScale = timeScale
    action.play()
    action.time = startTime
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
