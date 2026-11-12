import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { useTranslation } from 'react-i18next'
import Scene from './scene/Scene.jsx'
import LoadingScreen from './ui/LoadingScreen.jsx'

// Góc nhìn từ trên cao xuống toàn quán (giống nút "Toàn cảnh" ở bản thử)
const CAMERA = { position: [-9, 15, 9], fov: 50, near: 0.05, far: 80 }

export default function App() {
  const { t } = useTranslation()

  return (
    <>
      <Canvas
        role="img"
        aria-label={t('scene.label')}
        frameloop="demand"
        dpr={[1, 1.5]}
        shadows="percentage" // PCF; three mới đã bỏ PCFSoftShadowMap
        camera={CAMERA}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 0.95
        }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <LoadingScreen />
    </>
  )
}
