// Studio quay video nền: dựng lại cảnh quán (dùng chung component với app),
// camera chạy theo tools/render-video/shots.js, thời gian do run.js điều khiển từng khung hình.
import { Suspense, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, advance } from '@react-three/fiber'
import { create } from 'zustand'
import Cafe from '../../src/scene/Cafe.jsx'
import Guests from '../../src/scene/Guests.jsx'
import Lighting from '../../src/scene/Lighting.jsx'
import Passersby from '../../src/scene/Passersby.jsx'
import { LIGHTING_PRESETS } from '../../src/scene/lightingPresets.js'
import { CROSSFADE, FPS, HEIGHT, SHOTS, WIDTH, cameraAt } from './shots.js'

const PRESET = LIGHTING_PRESETS.night
const useShot = create(() => ({ ceiling: true, fog: SHOTS[0].fog }))

let studio = null // state của R3F (camera, gl…)
let clock = 0 // thời gian cảnh, liên tục qua các cảnh quay để người đi đường không bị giật

function Ready() {
  useEffect(() => {
    window.studioReady = true
  }, [])
  return null
}

function Studio() {
  const { ceiling, fog } = useShot()
  return (
    <>
      <Lighting preset={PRESET} />
      <fog attach="fog" args={[PRESET.sky, fog[0], fog[1]]} />
      <Cafe showCeiling={ceiling} />
      <Guests />
      <Passersby />
      <Ready />
    </>
  )
}

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 50))

/** Chuẩn bị một cảnh quay: bật/tắt trần, đổi sương, đặt ống kính. */
window.prepareShot = async (index) => {
  const shot = SHOTS[index]
  useShot.setState({ ceiling: shot.ceiling, fog: shot.fog })
  await nextTick() // đợi React cập nhật cảnh
  studio.camera.fov = shot.fov
  studio.camera.updateProjectionMatrix()
  return { name: shot.name, frames: Math.round(shot.duration * FPS) }
}

/** Vẽ khung hình thứ `frame` của cảnh quay `index`, trả về ảnh JPEG dạng data URL. */
window.renderFrame = (index, frame, { still = false } = {}) => {
  const shot = SHOTS[index]
  const totalFrames = Math.round(shot.duration * FPS)
  const { position, target } = cameraAt(shot, frame / (totalFrames - 1))
  studio.camera.position.set(...position)
  studio.camera.lookAt(...target)
  if (!still) clock += 1 / FPS
  advance(clock)
  return studio.gl.domElement.toDataURL('image/jpeg', 0.94)
}

/** Chạy cảnh vài giây trước khi quay để hoạt ảnh và bóng đổ ổn định. */
window.warmUp = (seconds) => {
  for (let i = 0; i < seconds * FPS; i++) {
    clock += 1 / FPS
    advance(clock)
  }
}

window.videoSettings = { fps: FPS, crossfade: CROSSFADE, shotCount: SHOTS.length }

createRoot(document.getElementById('root')).render(
  <div style={{ width: WIDTH, height: HEIGHT }}>
    <Canvas
      frameloop="never"
      dpr={1}
      shadows="percentage"
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      camera={{ fov: SHOTS[0].fov, near: 0.05, far: 80 }}
      onCreated={(state) => {
        state.gl.toneMappingExposure = 0.95
        studio = state
      }}
    >
      <Suspense fallback={null}>
        <Studio />
      </Suspense>
    </Canvas>
  </div>,
)
