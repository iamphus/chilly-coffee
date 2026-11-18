import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import cafeUrl from '../../assets/cafe/cafe.glb?url'
import { audioEngine } from '../audio/audioEngine.js'
import { excludedNpcIds } from '../characters/appearance.js'
import NetworkSync from '../net/NetworkSync.jsx'
import RemotePlayers from '../net/remote/RemotePlayers.jsx'
import { createColliders } from '../player/colliders.js'
import { createGameState } from '../player/gameState.js'
import Player from '../player/Player.jsx'
import ThirdPersonCamera from '../player/ThirdPersonCamera.jsx'
import { useCafeStore } from '../store.js'
import { createAtmosphere, setAtmosphereTarget, stepAtmosphere } from './atmosphere.js'
import Cafe from './Cafe.jsx'
import DustMotes from './DustMotes.jsx'
import Fog from './Fog.jsx'
import Guests from './Guests.jsx'
import LampGlows from './LampGlows.jsx'
import Lighting from './Lighting.jsx'
import { lightingFor } from './lightingPresets.js'
import NowPlayingSign from './NowPlayingSign.jsx'
import Passersby from './Passersby.jsx'
import Rain from './Rain.jsx'
import Surroundings from './surroundings/Surroundings.jsx'

const CLOCK_SYNC_MS = 30_000 // ở chế độ "Theo giờ", cập nhật góc nắng & màu trời mỗi 30 giây theo đồng hồ máy

function AtmosphereDriver({ atmosphereRef }) {
  const invalidate = useThree((state) => state.invalidate)
  useFrame((_, dt) => {
    if (stepAtmosphere(atmosphereRef.current, dt)) invalidate()
  })
  return null
}

export default function Scene() {
  const appearance = useCafeStore((state) => state.appearance)
  const lite = useCafeStore((state) => state.lite)
  const timeOfDay = useCafeStore((state) => state.timeOfDay)
  const rain = useCafeStore((state) => state.rain)

  const [initialPreset] = useState(() => lightingFor(timeOfDay, rain))
  const atmosphereRef = useRef(null)
  if (atmosphereRef.current === null) atmosphereRef.current = createAtmosphere(initialPreset)

  const { scene: cafe } = useGLTF(cafeUrl)
  const gl = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)
  const colliders = useMemo(() => createColliders(cafe), [cafe])
  const gameRef = useRef(null)
  if (gameRef.current === null) gameRef.current = createGameState()

  // Cập nhật mục tiêu bầu trời & ánh sáng khi đổi chế độ giờ, bật/tắt mưa, hoặc khi đồng hồ máy trôi qua từng phút
  useEffect(() => {
    const refresh = () => {
      setAtmosphereTarget(atmosphereRef.current, lightingFor(timeOfDay, rain))
      invalidate()
    }
    refresh()
    if (timeOfDay !== 'auto') return undefined
    const timer = setInterval(refresh, CLOCK_SYNC_MS)
    return () => clearInterval(timer)
  }, [invalidate, rain, timeOfDay])

  // Chỉ khi chạy dev: cho script thử (Playwright) đọc/ghi trạng thái nhân vật và store
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined
    window.__chilly = { gameRef, store: useCafeStore, gl, audio: audioEngine, atmosphereRef }
    return () => delete window.__chilly
  }, [gl])

  // Nhân vật người chơi (nếu giữ nguyên mẫu gốc) không xuất hiện thêm trong khách / người đi đường
  const exclude = useMemo(() => excludedNpcIds(appearance), [appearance])

  return (
    <>
      <AtmosphereDriver atmosphereRef={atmosphereRef} />
      <Lighting preset={initialPreset} atmosphereRef={atmosphereRef} shadows={!lite} />
      <Fog color={initialPreset.skyHorizon} near={initialPreset.fogNear} far={initialPreset.fogFar} atmosphereRef={atmosphereRef} />
      <Rain active={rain} count={lite ? 3500 : 9000} />
      {/* Camera đi trong quán nên giữ trần */}
      <Cafe showCeiling />
      <NowPlayingSign />
      <Surroundings preset={initialPreset} atmosphereRef={atmosphereRef} lite={lite} />
      <LampGlows strength={initialPreset.lampGlow} atmosphereRef={atmosphereRef} />
      {!lite && <DustMotes opacity={initialPreset.dust} atmosphereRef={atmosphereRef} />}
      <Guests exclude={exclude} />
      <Passersby exclude={exclude} />
      <Player gameRef={gameRef} colliders={colliders} />
      <ThirdPersonCamera gameRef={gameRef} colliders={colliders} />
      {/* Sau camera: bảng tên người khác dùng camera đã cập nhật của khung hình này */}
      <RemotePlayers />
      <NetworkSync gameRef={gameRef} />
    </>
  )
}
