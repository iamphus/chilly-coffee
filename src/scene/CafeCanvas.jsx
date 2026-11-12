import { Suspense, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import { useTranslation } from 'react-i18next'
import { useCafeStore } from '../store.js'
import { SPAWN } from '../player/gameState.js'
import AudioController from '../audio/AudioController.jsx'
import FocusTimer from '../focus/FocusTimer.jsx'
import GameHud from '../ui/GameHud.jsx'
import Scene from './Scene.jsx'

// Khung hình đầu: sau lưng nhân vật ở chỗ xuất hiện (ThirdPersonCamera chỉnh lại ngay từ khung đầu)
const CAMERA = {
  position: [SPAWN.position[0] - Math.sin(SPAWN.yaw) * 3, 1.8, SPAWN.position[2] - Math.cos(SPAWN.yaw) * 3],
  fov: 50,
  near: 0.05,
  far: 80,
}

const LIMITED_FPS = 30

/** Vẽ đều {fps} khung hình/giây (dùng với frameloop="demand") để đỡ nóng máy khi ngồi bàn hoặc ở chế độ nhẹ. */
function FrameLimiter({ fps }) {
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => {
    const id = setInterval(() => invalidate(), 1000 / fps)
    return () => clearInterval(id)
  }, [fps, invalidate])
  return null
}

/** Báo % tải mô hình cho landing (landing không import drei để giữ nhẹ). */
function ProgressReporter() {
  const progress = useProgress((state) => state.progress)
  useEffect(() => {
    useCafeStore.setState({ loadProgress: progress })
  }, [progress])
  return null
}

/**
 * Chạy khi mọi thứ trong Suspense đã tải xong. Biên dịch shader bất đồng bộ trước khi vẽ
 * khung hình đầu: biên dịch kiểu thường (lúc vẽ) có thể treo trang vài giây vì quán có nhiều đèn.
 */
function SceneReady() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    let cancelled = false
    gl.compileAsync(scene, camera)
      .catch(() => {}) // không biên dịch trước được thì vẫn vẽ bình thường
      .finally(() => {
        if (!cancelled) useCafeStore.setState({ sceneReady: true })
      })
    return () => {
      cancelled = true
    }
  }, [gl, scene, camera])

  return null
}

/**
 * Toàn bộ phần 3D. File này (cùng three, R3F, drei và mô hình) được tách thành chunk riêng,
 * chỉ tải khi trình duyệt rảnh hoặc khi bấm "Vào quán", để landing mở nhanh.
 */
export default function CafeCanvas() {
  const { t } = useTranslation()
  const sceneReady = useCafeStore((state) => state.sceneReady)
  const lite = useCafeStore((state) => state.lite)
  const seated = useCafeStore((state) => state.seat !== null)
  const limited = lite || seated

  return (
    <>
      <ProgressReporter />
      <Canvas
        role="img"
        aria-label={t('scene.label')}
        // Chưa vẽ cho tới khi shader biên dịch xong (SceneReady). Sau đó vẽ liên tục vì người
        // đi đường luôn chuyển động; ngồi bàn hoặc chế độ nhẹ thì giảm còn 30 khung hình/giây.
        // Ẩn tab thì trình duyệt tự ngừng vẽ.
        frameloop={!sceneReady ? 'never' : limited ? 'demand' : 'always'}
        dpr={lite ? 1 : [1, 1.5]}
        shadows="percentage" // PCF; three mới đã bỏ PCFSoftShadowMap
        camera={CAMERA}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 0.95
        }}
      >
        <Suspense fallback={null}>
          <Scene />
          <SceneReady />
        </Suspense>
        {sceneReady && limited && <FrameLimiter fps={LIMITED_FPS} />}
      </Canvas>
      {sceneReady && <GameHud />}
      {sceneReady && <FocusTimer />}
      {sceneReady && <AudioController />}
    </>
  )
}
