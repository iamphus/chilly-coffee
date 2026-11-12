import { useEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import cafeUrl from '../../assets/cafe/cafe.glb?url'
import { createColliders } from '../player/colliders.js'
import { createGameState } from '../player/gameState.js'
import Player from '../player/Player.jsx'
import ThirdPersonCamera from '../player/ThirdPersonCamera.jsx'
import { useCafeStore } from '../store.js'
import Cafe from './Cafe.jsx'
import DustMotes from './DustMotes.jsx'
import Fog from './Fog.jsx'
import Guests from './Guests.jsx'
import LampGlows from './LampGlows.jsx'
import Lighting from './Lighting.jsx'
import { LIGHTING_PRESETS, presetForHour } from './lightingPresets.js'
import Passersby from './Passersby.jsx'
import Surroundings from './surroundings/Surroundings.jsx'

// Ngày/đêm: theo cài đặt (mặc định theo giờ máy). Thêm ?time=day hoặc ?time=night vào URL để xem thử.
const requestedTime = new URLSearchParams(window.location.search).get('time')

function timeOfDayPreset(setting) {
  if (LIGHTING_PRESETS[requestedTime]) return LIGHTING_PRESETS[requestedTime]
  if (LIGHTING_PRESETS[setting]) return LIGHTING_PRESETS[setting]
  return LIGHTING_PRESETS[presetForHour(new Date().getHours())]
}

export default function Scene() {
  const characterId = useCafeStore((state) => state.characterId)
  const lite = useCafeStore((state) => state.lite)
  const preset = timeOfDayPreset(useCafeStore((state) => state.timeOfDay))
  const { scene: cafe } = useGLTF(cafeUrl)
  const gl = useThree((state) => state.gl)
  const colliders = useMemo(() => createColliders(cafe), [cafe])
  const gameRef = useRef(null)
  if (gameRef.current === null) gameRef.current = createGameState()

  // Chỉ khi chạy dev: cho script thử (Playwright) đọc/ghi trạng thái nhân vật và store
  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.__chilly = { gameRef, store: useCafeStore, gl }
    return () => delete window.__chilly
  }, [gl])

  // Nhân vật người chơi không xuất hiện thêm trong khách / người đi đường
  const exclude = useMemo(() => [characterId], [characterId])

  return (
    <>
      <Lighting preset={preset} shadows={!lite} />
      <Fog color={preset.skyHorizon} />
      {/* Camera đi trong quán nên giữ trần */}
      <Cafe showCeiling />
      <Surroundings preset={preset} lite={lite} />
      <LampGlows strength={preset.lampGlow} />
      {!lite && <DustMotes opacity={preset.dust} />}
      <Guests exclude={exclude} />
      <Passersby exclude={exclude} />
      <Player gameRef={gameRef} colliders={colliders} />
      <ThirdPersonCamera gameRef={gameRef} colliders={colliders} />
    </>
  )
}
