import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment } from '@react-three/drei'
import Character from '../../characters/Character.jsx'
import { CLIPS, preloadCharacters } from '../../characters/characterAssets.js'
import CustomCharacter from '../../characters/CustomCharacter.jsx'
import { PLAYABLE_CHARACTERS } from '../../characters/playableCharacters.js'
import { useRoomEnvironmentMap } from '../../scene/useRoomEnvironmentMap.js'

const SPACING = 1.15 // m giữa 2 nhân vật
const STEP_FORWARD = 0.45 // người đang chọn bước lên trước
const MOVE_TAU = 0.12 // giây
const CAMERA = { height: 1.0, distance: 4.6, lookHeight: 0.28 }
const CLOSEUP_CAMERA = { height: 0.88, distance: 3.1, lookHeight: 0.42 }

const xOf = (index) => (index - (PLAYABLE_CHARACTERS.length - 1) / 2) * SPACING
const ease = (dt) => 1 - Math.exp(-dt / MOVE_TAU)

function setCursor(value) {
  document.body.style.cursor = value
}

function LineupCharacter({ id, index, selected, appearance, turntableYawRef, onSelect }) {
  const group = useRef(null)

  useFrame((_, dt) => {
    if (!group.current) return
    const z = selected ? STEP_FORWARD : 0
    group.current.position.z += (z - group.current.position.z) * ease(dt)
    const targetYaw = selected ? turntableYawRef.current : 0
    const deltaYaw = Math.atan2(Math.sin(targetYaw - group.current.rotation.y), Math.cos(targetYaw - group.current.rotation.y))
    group.current.rotation.y += deltaYaw * ease(dt)
  })

  return (
    <group
      ref={group}
      position={[xOf(index), 0, 0]}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(index)
      }}
      onPointerOver={() => setCursor('pointer')}
      onPointerOut={() => setCursor('')}
    >
      {selected && appearance ? (
        <CustomCharacter appearance={appearance} clip={CLIPS.WAVE} />
      ) : (
        <Character id={id} clip={selected ? CLIPS.WAVE : CLIPS.STAND} startTime={(index * 0.37) % 1} />
      )}
    </group>
  )
}

/** Vòng sáng dưới chân nhân vật đang chọn, trượt theo khi đổi */
function SelectionRing({ selected }) {
  const ring = useRef(null)
  useFrame(({ clock }, dt) => {
    if (!ring.current) return
    ring.current.position.x += (xOf(selected) - ring.current.position.x) * ease(dt)
    ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.04)
  })
  return (
    <mesh ref={ring} position={[xOf(selected), 0.01, STEP_FORWARD]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.3, 0.36, 48]} />
      <meshBasicMaterial color="#e9b07f" transparent opacity={0.9} toneMapped={false} />
    </mesh>
  )
}

/** Camera trượt ngang theo nhân vật đang chọn; khi mở tủ đồ thì tiến lại gần và dịch khung sang phải một chút. */
function CameraRig({ selected, customizing }) {
  const state = useRef({
    x: xOf(selected),
    y: CAMERA.height,
    z: CAMERA.distance,
    lookX: xOf(selected),
    lookY: CAMERA.lookHeight,
  })

  useFrame(({ camera, size }, dt) => {
    const k = ease(dt)
    const preset = customizing ? CLOSEUP_CAMERA : CAMERA
    // Màn hình rộng: khi mở tủ đồ ở cột phải, dịch điểm nhìn sang phải để nhân vật nằm thoáng ở bên trái
    const shiftX = customizing && size.width > 860 ? 0.48 : 0
    const targetX = xOf(selected) + shiftX
    const s = state.current
    s.x += (targetX - s.x) * k
    s.y += (preset.height - s.y) * k
    s.z += (preset.distance - s.z) * k
    s.lookX += (targetX - s.lookX) * k
    s.lookY += (preset.lookHeight - s.lookY) * k
    camera.position.set(s.x, s.y, s.z)
    camera.lookAt(s.lookX, s.lookY, customizing ? STEP_FORWARD * 0.6 : 0)
  })
  return null
}

/** Cho người dùng kéo ngang trên canvas để xoay thử nhân vật 360° (xem tóc sau lưng, ba lô…). */
function TurntableDrag({ turntableYawRef, selected }) {
  const domElement = useThree((s) => s.gl.domElement)

  useEffect(() => {
    turntableYawRef.current = 0
  }, [selected, turntableYawRef])

  useEffect(() => {
    let dragging = false
    let lastX = 0
    const onDown = (event) => {
      if (event.button !== 0 && event.pointerType === 'mouse') return
      dragging = true
      lastX = event.clientX
    }
    const onMove = (event) => {
      if (!dragging) return
      const dx = event.clientX - lastX
      lastX = event.clientX
      turntableYawRef.current += dx * 0.012
    }
    const onUp = () => {
      dragging = false
    }
    domElement.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      domElement.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [domElement, turntableYawRef])

  return null
}

/** Hàng nhân vật để chọn: người đang chọn bước lên trước và vẫy tay; bấm vào ai thì chọn người đó. */
export default function CharacterLineup({ selected, onSelect, appearance, customizing = false }) {
  const envMap = useRoomEnvironmentMap()
  const turntableYawRef = useRef(0)

  return (
    <>
      <Environment map={envMap} environmentIntensity={0.35} />
      <hemisphereLight args={['#ffe9cc', '#3a2c22', 1.6]} />
      <directionalLight position={[2.5, 5, 4]} intensity={2.4} color="#fff4e0" />
      {/* Đèn hắt từ sau lưng cho viền nhân vật nổi trên nền tối */}
      <directionalLight position={[-2, 3, -4]} intensity={2.2} color="#ffc98f" />

      {PLAYABLE_CHARACTERS.map((id, index) => (
        <LineupCharacter
          key={id}
          id={id}
          index={index}
          selected={index === selected}
          appearance={appearance}
          turntableYawRef={turntableYawRef}
          onSelect={onSelect}
        />
      ))}
      <SelectionRing selected={selected} />
      <ContactShadows position={[0, 0, 0.2]} scale={16} blur={2.4} far={1.4} opacity={0.5} resolution={512} />
      <CameraRig selected={selected} customizing={customizing} />
      <TurntableDrag turntableYawRef={turntableYawRef} selected={selected} />
    </>
  )
}

preloadCharacters(PLAYABLE_CHARACTERS)
