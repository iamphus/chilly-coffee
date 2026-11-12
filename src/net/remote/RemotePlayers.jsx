import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { AnimationClip, AnimationMixer, Box3, LoopRepeat, Vector3 } from 'three'
import cafeUrl from '../../../assets/cafe/cafe.glb?url'
import { CHARACTER_URLS, CLIPS } from '../../characters/characterAssets.js'
import { DEFAULT_CHARACTER } from '../../characters/playableCharacters.js'
import { createActionClips } from '../../player/actionClips.js'
import { dampAngle } from '../../player/gameState.js'
import Laptop from '../../scene/Laptop.jsx'
import { laptopPoses, seatPose } from '../../scene/seating.js'
import { peerMotion, tagAnchors, useNetStore } from '../netStore.js'

const FOLLOW_TAU = 0.12 // giây: nội suy vị trí nhận qua mạng (gửi 8 lần/giây)
const TURN_TAU = 0.1
const WALK_ANIM_SPEED = 1.1
const FADE = 0.2
const TAG_ABOVE_HEAD = 0.12
const TAG_MAX_DISTANCE = 18 // m: xa hơn thì ẩn bảng tên

/** Một người chơi khác: nhân vật đã chọn, đi lại mượt theo vị trí nhận được, ngồi / mở laptop / hành động. */
function RemotePlayer({ id, peer }) {
  const characterId = CHARACTER_URLS[peer.character] ? peer.character : DEFAULT_CHARACTER
  const { scene, animations } = useGLTF(CHARACTER_URLS[characterId])
  const { scene: cafe } = useGLTF(cafeUrl)
  const group = useRef(null)
  const animation = useRef(null)
  const scratch = useRef(null)
  if (scratch.current === null) scratch.current = new Vector3()

  const model = useMemo(() => {
    const copy = scene.clone(true)
    copy.traverse((object) => {
      if (object.isMesh) object.castShadow = true
    })
    return copy
  }, [scene])
  const height = useMemo(() => new Box3().setFromObject(model).getSize(new Vector3()).y || 1, [model])
  const seatTransform = useMemo(() => (peer.seat ? seatPose(peer.seat) : null), [peer.seat])
  const laptop = useMemo(() => (peer.seat ? laptopPoses(cafe, [peer.seat])[0] : null), [cafe, peer.seat])

  useEffect(() => {
    const mixer = new AnimationMixer(model)
    const clips = {
      idle: AnimationClip.findByName(animations, CLIPS.STAND),
      walk: AnimationClip.findByName(animations, CLIPS.WALK),
      type: AnimationClip.findByName(animations, CLIPS.TYPE),
      seatedDrink: AnimationClip.findByName(animations, CLIPS.DRINK),
      ...createActionClips(characterId, animations),
    }
    const actions = Object.fromEntries(Object.entries(clips).map(([key, clip]) => [key, mixer.clipAction(clip).setLoop(LoopRepeat, Infinity)]))
    actions.idle.play()
    animation.current = { mixer, actions, current: actions.idle }
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(model)
    }
  }, [model, animations, characterId])

  // Vị trí ban đầu = vị trí trong trạng thái (không trượt từ gốc toạ độ vào)
  useEffect(() => {
    const motion = peerMotion.get(id)
    if (group.current && motion) group.current.position.set(motion.x, motion.y ?? 0, motion.z)
  }, [id])

  useEffect(() => () => tagAnchors.delete(id), [id])

  useFrame(({ camera, size }, frameDelta) => {
    const dt = Math.min(frameDelta, 0.1)
    const body = group.current
    const point = scratch.current
    if (!body) return
    let speed = 0

    if (seatTransform) {
      body.position.fromArray(seatTransform.position)
      body.rotation.y = seatTransform.rotation[1]
    } else {
      const motion = peerMotion.get(id)
      if (motion) {
        const before = point.copy(body.position)
        const k = 1 - Math.exp(-dt / FOLLOW_TAU)
        body.position.x += (motion.x - body.position.x) * k
        body.position.y += ((motion.y ?? 0) - body.position.y) * k
        body.position.z += (motion.z - body.position.z) * k
        body.rotation.y = dampAngle(body.rotation.y, motion.yaw, TURN_TAU, dt)
        speed = before.distanceTo(body.position) / Math.max(dt, 1e-3)
        if (!motion.moving && speed < 0.3) speed = 0
      }
    }

    const anim = animation.current
    if (anim) {
      const key = peer.seat ? (peer.laptopOpen ? 'type' : 'seatedDrink') : speed > 0.1 ? 'walk' : (anim.actions[peer.action] ? peer.action : 'idle')
      const next = anim.actions[key]
      if (next !== anim.current) {
        next.reset().fadeIn(FADE).play()
        anim.current.fadeOut(FADE)
        anim.current = next
      }
      if (key === 'walk') next.timeScale = Math.min(speed, 3.2) / WALK_ANIM_SPEED
      anim.mixer.update(dt)
    }

    // Bảng tên: chiếu đỉnh đầu ra màn hình
    point.copy(body.position)
    point.y += height + TAG_ABOVE_HEAD
    const distance = point.distanceTo(camera.position)
    point.project(camera)
    tagAnchors.set(id, {
      x: ((point.x + 1) / 2) * size.width,
      y: ((1 - point.y) / 2) * size.height,
      visible: point.z < 1 && distance < TAG_MAX_DISTANCE,
    })
  })

  return (
    <>
      <group ref={group}>
        <primitive object={model} />
      </group>
      {laptop && <Laptop position={laptop.position} rotation={laptop.rotation} open={Boolean(peer.laptopOpen)} />}
    </>
  )
}

/** Tất cả người chơi khác trong phòng. Đặt sau ThirdPersonCamera để bảng tên dùng camera của khung hình này. */
export default function RemotePlayers() {
  const peers = useNetStore((state) => state.peers)
  return Object.entries(peers).map(([id, peer]) => <RemotePlayer key={id} id={id} peer={peer} />)
}
