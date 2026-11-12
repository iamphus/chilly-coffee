// Studio quay video nền: dựng lại cảnh quán (dùng chung component với app), thêm nhân vật chính,
// camera chạy theo tools/render-video/shots.js, thời gian do run.js điều khiển từng khung hình.
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, advance, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { create } from 'zustand'
import cafeUrl from '../../assets/cafe/cafe.glb?url'
import Character from '../../src/characters/Character.jsx'
import { CLIPS } from '../../src/characters/characterAssets.js'
import Cafe from '../../src/scene/Cafe.jsx'
import Guests from '../../src/scene/Guests.jsx'
import Laptop from '../../src/scene/Laptop.jsx'
import Lighting from '../../src/scene/Lighting.jsx'
import Passersby from '../../src/scene/Passersby.jsx'
import Surroundings from '../../src/scene/surroundings/Surroundings.jsx'
import { LIGHTING_PRESETS } from '../../src/scene/lightingPresets.js'
import { laptopPoses, seatPose } from '../../src/scene/seating.js'
import { HERO_ID, HERO_SEAT, heroAt } from './hero.js'
import {
  CROSSFADE,
  FPS,
  HEIGHT,
  SHOTS,
  SUPERSAMPLE,
  WARM_UP,
  WIDTH,
  cameraAt,
  frameCount,
  shotStart,
} from './shots.js'

const PRESET = LIGHTING_PRESETS.night
// Nhân vật chính không xuất hiện thêm trong khách/người đi đường; người chạy bộ đi nhanh hay chắn máy ở cảnh 1
const EXCLUDE = [HERO_ID, 'passerby_jogger']
const useShot = create(() => ({ ceiling: true, fog: SHOTS[0].fog, hero: SHOTS[0].hero }))

let studio = null // state của R3F (camera, gl…)

/** Nhân vật chính đang đi: vị trí lấy từ heroAt theo đồng hồ cảnh. */
function WalkingHero() {
  const group = useRef(null)
  const [pose, setPose] = useState(() => heroAt(0))

  useFrame(({ clock }) => {
    const next = heroAt(clock.elapsedTime - WARM_UP)
    group.current?.position.set(...next.position)
    group.current?.rotation.set(0, next.yaw, 0)
    if (next.clip !== pose.clip) setPose(next) // đổi hoạt ảnh (đi → vẫy tay)
  })

  return <Character ref={group} id={HERO_ID} clip={pose.clip} timeScale={pose.timeScale} />
}

/** Nhân vật chính ngồi làm việc ở bàn có mèo. */
function SeatedHero() {
  const { scene: cafe } = useGLTF(cafeUrl)
  const [laptop] = useMemo(() => laptopPoses(cafe, [HERO_SEAT]), [cafe])
  return (
    <>
      <Character id={HERO_ID} clip={CLIPS.TYPE} startTime={0.5} {...seatPose(HERO_SEAT)} />
      <Laptop position={laptop.position} rotation={laptop.rotation} />
    </>
  )
}

function Ready() {
  useEffect(() => {
    window.studioReady = true
  }, [])
  return null
}

function Studio() {
  const { ceiling, fog, hero } = useShot()
  return (
    <>
      <Lighting preset={PRESET} />
      <fog attach="fog" args={[PRESET.skyHorizon, fog[0], fog[1]]} />
      <Cafe showCeiling={ceiling} />
      <Surroundings preset={PRESET} />
      <Guests exclude={EXCLUDE} />
      <Passersby exclude={EXCLUDE} />
      {hero === 'walk' ? <WalkingHero /> : <SeatedHero />}
      <Ready />
    </>
  )
}

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 50))

/** Chạy cảnh vài giây trước khi quay để hoạt ảnh và bóng đổ ổn định. */
window.warmUp = () => {
  for (let i = 1; i <= WARM_UP * FPS; i++) advance(i / FPS)
}

/** Chuẩn bị một cảnh quay: bật/tắt trần, đổi sương, nhân vật chính, ống kính. */
window.prepareShot = async (index) => {
  const shot = SHOTS[index]
  useShot.setState({ ceiling: shot.ceiling, fog: shot.fog, hero: shot.hero })
  await nextTick() // đợi React cập nhật cảnh
  studio.camera.fov = shot.fov
  studio.camera.updateProjectionMatrix()
  return { name: shot.name, frames: frameCount(shot) }
}

/** Vẽ khung hình thứ `frame` của cảnh quay `index`, trả về ảnh JPEG dạng data URL. */
window.renderFrame = (index, frame) => {
  const shot = SHOTS[index]
  const clock = shotStart(index) + frame / FPS
  const hero = heroAt(clock - WARM_UP).position
  const { position, target } = cameraAt(shot, frame / (frameCount(shot) - 1), hero)
  studio.camera.position.set(...position)
  studio.camera.lookAt(...target)
  advance(clock)
  return studio.gl.domElement.toDataURL('image/jpeg', 0.95)
}

window.videoSettings = {
  fps: FPS,
  crossfade: CROSSFADE,
  width: WIDTH,
  height: HEIGHT,
  transitions: SHOTS.map((shot) => shot.transition ?? 'fade'),
}

createRoot(document.getElementById('root')).render(
  <div style={{ width: WIDTH, height: HEIGHT }}>
    <Canvas
      frameloop="never"
      dpr={SUPERSAMPLE}
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
