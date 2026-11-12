import { useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import cafeUrl from '../../assets/cafe/cafe.glb?url'
import { createColliders } from '../player/colliders.js'
import { createGameState } from '../player/gameState.js'
import Player from '../player/Player.jsx'
import ThirdPersonCamera from '../player/ThirdPersonCamera.jsx'
import { useCafeStore } from '../store.js'
import Cafe from './Cafe.jsx'
import Fog from './Fog.jsx'
import Guests from './Guests.jsx'
import Lighting from './Lighting.jsx'
import { LIGHTING_PRESETS, presetForHour } from './lightingPresets.js'
import Passersby from './Passersby.jsx'

// Ngày/đêm theo giờ máy. Thêm ?time=day hoặc ?time=night vào URL để xem thử.
const requestedTime = new URLSearchParams(window.location.search).get('time')
const TIME_OF_DAY = LIGHTING_PRESETS[requestedTime] ? requestedTime : presetForHour(new Date().getHours())
const PRESET = LIGHTING_PRESETS[TIME_OF_DAY]

export default function Scene() {
  const characterId = useCafeStore((state) => state.characterId)
  const { scene: cafe } = useGLTF(cafeUrl)
  const colliders = useMemo(() => createColliders(cafe), [cafe])
  const gameRef = useRef(null)
  if (gameRef.current === null) gameRef.current = createGameState()

  // Nhân vật người chơi không xuất hiện thêm trong khách / người đi đường
  const exclude = useMemo(() => [characterId], [characterId])

  return (
    <>
      <Lighting preset={PRESET} />
      <Fog color={PRESET.sky} />
      {/* Camera đi trong quán nên giữ trần */}
      <Cafe showCeiling />
      <Guests exclude={exclude} />
      <Passersby exclude={exclude} />
      <Player gameRef={gameRef} colliders={colliders} />
      <ThirdPersonCamera gameRef={gameRef} colliders={colliders} />
    </>
  )
}
