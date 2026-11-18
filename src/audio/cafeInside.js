// Tạp âm nhẹ bên trong quán tự tạo bằng Web Audio (không cần file, không lo bản quyền):
// hơi phòng ấm áp, máy pha cà phê xì hơi ở quầy barista, tiếng cốc sứ / thìa chạm nhẹ thỉnh thoảng.

const STEAM_GAP = [20, 46] // giây giữa hai lần máy pha cà phê xì hơi
const CUP_GAP = [11, 28] // giây giữa hai lần cốc / thìa lách cách

const between = ([min, max]) => min + Math.random() * (max - min)

function createNoise(context, seconds = 3) {
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

export class CafeAmbience {
  constructor(context, destination) {
    this.context = context
    this.output = context.createGain()
    this.output.connect(destination)
    this.noise = createNoise(context)
    this.timers = []

    // Hơi ấm trong phòng + tiếng máy lạnh / tủ mát rì rầm rất nhỏ ở nền
    const roomAir = context.createBufferSource()
    roomAir.buffer = this.noise
    roomAir.loop = true
    const airFilter = context.createBiquadFilter()
    airFilter.type = 'bandpass'
    airFilter.frequency.value = 380
    airFilter.Q.value = 0.7
    const airGain = context.createGain()
    airGain.gain.value = 0.028
    roomAir.connect(airFilter).connect(airGain).connect(this.output)
    roomAir.start(0, Math.random())

    this.scheduleSteam()
    this.scheduleCup()
  }

  later(seconds, callback) {
    this.timers.push(setTimeout(callback, seconds * 1000))
  }

  /** Máy pha cà phê đánh sữa / chiết xuất ở quầy (hơi lệch sang trái). */
  scheduleSteam() {
    this.later(between(STEAM_GAP), () => {
      const { context } = this
      const now = context.currentTime
      const duration = between([1.8, 3.4])

      const source = context.createBufferSource()
      source.buffer = this.noise
      source.loop = true

      const bandpass = context.createBiquadFilter()
      bandpass.type = 'bandpass'
      bandpass.frequency.setValueAtTime(between([2200, 2900]), now)
      bandpass.frequency.exponentialRampToValueAtTime(between([1500, 1900]), now + duration)
      bandpass.Q.value = 1.1

      const envelope = context.createGain()
      envelope.gain.setValueAtTime(0.0001, now)
      envelope.gain.exponentialRampToValueAtTime(between([0.028, 0.048]), now + 0.25)
      envelope.gain.setValueAtTime(between([0.022, 0.04]), now + duration - 0.35)
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)

      const pan = context.createStereoPanner()
      pan.pan.value = between([-0.45, -0.15])

      source.connect(bandpass).connect(envelope).connect(pan).connect(this.output)
      source.start(now, Math.random())
      source.stop(now + duration + 0.05)

      this.scheduleSteam()
    })
  }

  /** Tiếng cốc sứ đặt lên đĩa hoặc thìa khuấy nhẹ ở các bàn xung quanh. */
  scheduleCup() {
    this.later(between(CUP_GAP), () => {
      const { context } = this
      const start = context.currentTime
      const hits = Math.random() < 0.45 ? 2 : 1
      const base = between([1850, 2550])
      const pan = context.createStereoPanner()
      pan.pan.value = between([-0.7, 0.7])
      pan.connect(this.output)

      for (let i = 0; i < hits; i++) {
        const t = start + i * between([0.09, 0.17])
        for (const [ratio, level, decay] of [
          [1, 0.018, 0.085],
          [1.58, 0.01, 0.055],
        ]) {
          const ping = context.createOscillator()
          ping.type = 'sine'
          ping.frequency.setValueAtTime(base * ratio * between([0.98, 1.02]), t)
          const env = context.createGain()
          env.gain.setValueAtTime(0.0001, t)
          env.gain.exponentialRampToValueAtTime(level, t + 0.004)
          env.gain.exponentialRampToValueAtTime(0.0001, t + decay)
          ping.connect(env).connect(pan)
          ping.start(t)
          ping.stop(t + decay + 0.01)
        }
      }

      this.scheduleCup()
    })
  }

  dispose() {
    this.timers.forEach(clearTimeout)
    this.output.disconnect()
  }
}
