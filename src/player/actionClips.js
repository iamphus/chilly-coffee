// Hoạt ảnh cho thanh hành động (vẫy tay, uống cà phê, vươn vai, ngáp).
// File nhân vật chỉ có sẵn Vay_Tay và Uong (uống khi ngồi), nên vươn vai và ngáp được dựng bằng code
// trên các khớp có sẵn: <id>_Tay_Phai / _Tay_Trai (vai: trục z giơ ngang/lên cao, trục x đưa ra trước),
// <id>_Dau (trục x: cúi xuống > 0, ngửa lên < 0), <id>_Than (nhún người lên xuống).
import { AnimationClip, Euler, Quaternion, QuaternionKeyframeTrack, VectorKeyframeTrack } from 'three'
import { CLIPS } from '../characters/characterAssets.js'

export const ACTIONS = ['wave', 'drink', 'stretch', 'yawn']

const quaternion = ([x, y, z]) => new Quaternion().setFromEuler(new Euler(x, y, z)).toArray()
const rotationTrack = (node, times, angles) =>
  new QuaternionKeyframeTrack(`${node}.quaternion`, times, angles.flatMap(quaternion))
const liftTrack = (node, times, heights) =>
  new VectorKeyframeTrack(`${node}.position`, times, heights.flatMap((y) => [0, y, 0]))

function stretchClip(id) {
  const times = [0, 0.7, 1.7, 2.4, 3.0]
  return new AnimationClip('Vuon_Vai', 3.0, [
    // Giang tay chữ V (không giơ thẳng): đầu chibi to, giơ thẳng thì nhìn từ sau lưng bị đầu che mất
    rotationTrack(`${id}_Tay_Phai`, times, [[0, 0, 0], [0.2, 0, 2.2], [0.25, 0, 2.4], [0, 0, 0], [0, 0, 0]]),
    rotationTrack(`${id}_Tay_Trai`, times, [[0, 0, 0], [0.2, 0, -2.2], [0.25, 0, -2.4], [0, 0, 0], [0, 0, 0]]),
    rotationTrack(`${id}_Dau`, times, [[0, 0, 0], [-0.25, 0, 0], [-0.3, 0, 0], [0, 0, 0], [0, 0, 0]]),
    liftTrack(`${id}_Than`, times, [0, 0.03, 0.035, 0, 0]),
  ])
}

function yawnClip(id) {
  const times = [0, 0.8, 2.0, 2.7, 3.4]
  return new AnimationClip('Ngap', 3.4, [
    // Tay phải đưa lên che miệng
    rotationTrack(`${id}_Tay_Phai`, times, [[0, 0, 0], [-2.5, 0, -0.35], [-2.55, 0, -0.35], [0, 0, 0], [0, 0, 0]]),
    rotationTrack(`${id}_Dau`, times, [[0, 0, 0], [-0.3, 0, 0.05], [-0.32, 0, -0.05], [0.04, 0, 0], [0, 0, 0]]),
    liftTrack(`${id}_Than`, times, [0, 0.015, 0.015, 0, 0]),
  ])
}

/** Uống khi đứng: lấy Uong (vốn để ngồi) nhưng bỏ chân co và tay trái tì bàn. */
function standingDrinkClip(id, animations) {
  const seated = AnimationClip.findByName(animations, CLIPS.DRINK)
  const keep = [`${id}_Tay_Phai.`, `${id}_Dau.`]
  return new AnimationClip(
    'Uong_Dung',
    seated.duration,
    seated.tracks.filter((track) => keep.some((prefix) => track.name.startsWith(prefix))),
  )
}

/** Hoạt ảnh của từng hành động cho nhân vật `id`. */
export function createActionClips(id, animations) {
  return {
    wave: AnimationClip.findByName(animations, CLIPS.WAVE),
    drink: standingDrinkClip(id, animations),
    stretch: stretchClip(id),
    yawn: yawnClip(id),
  }
}
