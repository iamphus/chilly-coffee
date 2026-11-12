// Bộ trộn âm thanh của quán:
//   nhạc quán (Radio) ─ gain ─ lọc trầm ┐
//                                        ├─ master ─ loa
//   tạp âm phố (StreetAmbience) ─ gain ─ lọc trầm ┘
// Ngoài đường: tạp âm to, nhạc nhỏ và trầm (vọng từ trong quán). Trong quán: tạp âm nhỏ và trầm
// (cửa kính chắn), nhạc to rõ. Chuyển mượt bằng setTargetAtTime.
import { Radio } from './radio.js'
import { StreetAmbience } from './street.js'

export const MIX = {
  outside: { music: 0.2, musicCutoff: 650, ambience: 1, ambienceCutoff: 18000 },
  inside: { music: 1, musicCutoff: 18000, ambience: 0.2, ambienceCutoff: 900 },
}
const MUSIC_LEVEL = 0.55 // âm lượng nhạc gốc khá to, hạ bớt cho êm
const TRANSITION = 0.6 // giây (hằng số thời gian; ~2 giây là chuyển xong)

class AudioEngine {
  context = null
  ready = false
  state = { inside: false, muted: false, musicOn: true, musicVolume: 0.8, ambienceVolume: 0.8, night: false }

  /** Gọi trong một thao tác của người dùng (bấm nút) để trình duyệt cho phát âm thanh. */
  unlock() {
    if (!this.context) {
      const AudioContextClass = window.AudioContext ?? window.webkitAudioContext
      if (!AudioContextClass) return
      this.context = new AudioContextClass()
    }
    this.context.resume().catch(() => {})
  }

  /** Dựng các lớp âm thanh và bắt đầu phát. onTrackChange(track) khi đổi bài. */
  async start(onTrackChange) {
    this.unlock()
    if (!this.context || this.ready) return
    const context = this.context
    this.master = context.createGain()
    this.master.connect(context.destination)

    this.musicGain = context.createGain()
    this.musicFilter = context.createBiquadFilter()
    this.musicFilter.type = 'lowpass'
    this.musicGain.gain.value = 0
    this.musicGain.connect(this.musicFilter).connect(this.master)

    this.ambienceGain = context.createGain()
    this.ambienceFilter = context.createBiquadFilter()
    this.ambienceFilter.type = 'lowpass'
    this.ambienceGain.gain.value = 0
    this.ambienceGain.connect(this.ambienceFilter).connect(this.master)

    this.street = new StreetAmbience(context, this.ambienceGain)
    this.radio = new Radio(onTrackChange)
    context.createMediaElementSource(this.radio.element).connect(this.musicGain)
    this.ready = true
    this.apply(true)

    if (await this.radio.prepare()) {
      if (this.state.musicOn) this.radio.start()
    } else {
      this.radio = null // không có file nhạc trong assets/music/
    }
  }

  /** Cập nhật trạng thái (vị trí trong/ngoài quán, tắt tiếng, âm lượng, ngày đêm) rồi trộn lại. */
  set(changes) {
    const musicWasOn = this.state.musicOn
    Object.assign(this.state, changes)
    if (!this.ready) return
    if (this.radio && musicWasOn !== this.state.musicOn) {
      if (this.state.musicOn) this.radio.start()
      else this.radio.stop()
    }
    this.apply()
  }

  apply(immediate = false) {
    const { inside, muted, musicOn, musicVolume, ambienceVolume, night } = this.state
    const mix = inside ? MIX.inside : MIX.outside
    const now = this.context.currentTime
    const tau = immediate ? 0.01 : TRANSITION
    this.master.gain.setTargetAtTime(muted ? 0 : 1, now, 0.15)
    this.musicGain.gain.setTargetAtTime(musicOn ? mix.music * musicVolume * MUSIC_LEVEL : 0, now, tau)
    this.musicFilter.frequency.setTargetAtTime(mix.musicCutoff, now, tau)
    this.ambienceGain.gain.setTargetAtTime(mix.ambience * ambienceVolume, now, tau)
    this.ambienceFilter.frequency.setTargetAtTime(mix.ambienceCutoff, now, tau)
    this.street.setNight(night)
  }

  /** Rời quán: dừng hết. */
  stop() {
    if (!this.ready) return
    this.radio?.stop()
    this.street.dispose()
    this.master.disconnect()
    this.ready = false
  }
}

export const audioEngine = new AudioEngine()
