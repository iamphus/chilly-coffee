import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { ContactShadows, Environment } from '@react-three/drei'
import Character from '../../characters/Character.jsx'
import { CLIPS, preloadCharacters } from '../../characters/characterAssets.js'
import { PLAYABLE_CHARACTERS } from '../../characters/playableCharacters.js'
import { useRoomEnvironmentMap } from '../../scene/useRoomEnvironmentMap.js'

const SPACING = 1.15 // m giữa 2 nhân vật
const STEP_FORWARD = 0.45 // người đang chọn bước lên trước
const MOVE_TAU = 0.12 // giây
// Nhìn vào điểm thấp hơn giữa người → hàng nhân vật nằm hơi cao, chừa phần dưới màn hình cho bảng chọn
const CAMERA = { height: 1.0, distance: 4.6, lookHeight: 0.28 }

const xOf = (index) => (index - (PLAYABLE_CHARACTERS.length - 1) / 2) * SPACING
const ease = (dt) => 1 - Math.exp(-dt / MOVE_TAU)

function setCursor(value) {
  document.body.style.cursor = value
}

function LineupCharacter({ id, index, selected, onSelect }) {
  const group = useRef(null)

  useFrame((_, dt) => {
    if (!group.current) return
    const z = selected ? STEP_FORWARD : 0
    group.current.position.z += (z - group.current.position.z) * ease(dt)
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
      <Character id={id} clip={selected ? CLIPS.WAVE : CLIPS.STAND} startTime={(index * 0.37) % 1} />
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

/** Camera trượt ngang theo nhân vật đang chọn, nhìn ngang tầm ngực */
function CameraRig({ selected }) {
  const x = useRef(xOf(selected))
  useFrame(({ camera }, dt) => {
    x.current += (xOf(selected) - x.current) * ease(dt)
    camera.position.set(x.current, CAMERA.height, CAMERA.distance)
    camera.lookAt(x.current, CAMERA.lookHeight, 0)
  })
  return null
}

/** Hàng nhân vật để chọn: người đang chọn bước lên trước và vẫy tay; bấm vào ai thì chọn người đó. */
export default function CharacterLineup({ selected, onSelect }) {
  const envMap = useRoomEnvironmentMap()

  return (
    <>
      <Environment map={envMap} environmentIntensity={0.35} />
      <hemisphereLight args={['#ffe9cc', '#3a2c22', 1.6]} />
      <directionalLight position={[2.5, 5, 4]} intensity={2.4} color="#fff4e0" />
      {/* Đèn hắt từ sau lưng cho viền nhân vật nổi trên nền tối */}
      <directionalLight position={[-2, 3, -4]} intensity={2.2} color="#ffc98f" />

      {PLAYABLE_CHARACTERS.map((id, index) => (
        <LineupCharacter key={id} id={id} index={index} selected={index === selected} onSelect={onSelect} />
      ))}
      <SelectionRing selected={selected} />
      <ContactShadows position={[0, 0, 0.2]} scale={16} blur={2.4} far={1.4} opacity={0.5} resolution={512} />
      <CameraRig selected={selected} />
    </>
  )
}

preloadCharacters(PLAYABLE_CHARACTERS)
