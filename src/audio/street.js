// Tạp âm đường phố tự tạo bằng Web Audio (không cần file, không lo bản quyền):
// xe cộ ù ù ở xa, gió lá, xe máy thỉnh thoảng chạy ngang (trái → phải), chim hót ban ngày, dế kêu buổi tối.

const MOTORBIKE_GAP = [5, 13] // giây giữa hai lần xe máy chạy qua
const BIRD_GAP = [1.5, 5]

const between = ([min, max]) => min + Math.random() * (max - min)

function noiseBuffer(context, seconds = 4) {
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

function loopNoise(context, buffer) {
  const source = context.createBufferSource()
  source.buffer = buffer
  source.loop = true
  source.loopStart = Math.random()
  source.start(0, Math.random() * buffer.duration)
  return source
}

/** Biên độ dao động chậm (LFO) cộng vào một AudioParam. */
function wobble(context, param, rate, depth) {
  const lfo = context.createOscillator()
  const amount = context.createGain()
  lfo.frequency.value = rate
  amount.gain.value = depth
  lfo.connect(amount).connect(param)
  lfo.start()
  return lfo
}

export class StreetAmbience {
  constructor(context, destination) {
    this.context = context
    this.output = context.createGain()
    this.output.connect(destination)
    this.noise = noiseBuffer(context)
    this.timers = []
    this.night = false

    // Xe cộ ở xa: nhiễu trầm, to nhỏ chậm rãi
    const traffic = loopNoise(context, this.noise)
    const trafficFilter = context.createBiquadFilter()
    trafficFilter.type = 'lowpass'
    trafficFilter.frequency.value = 260
    const trafficGain = context.createGain()
    trafficGain.gain.value = 0.32
    wobble(context, trafficGain.gain, 0.07, 0.1)
    traffic.connect(trafficFilter).connect(trafficGain).connect(this.output)

    // Gió lùa qua lá cây
    const wind = loopNoise(context, this.noise)
    const windFilter = context.createBiquadFilter()
    windFilter.type = 'bandpass'
    windFilter.frequency.value = 1400
    windFilter.Q.value = 0.6
    wobble(context, windFilter.frequency, 0.05, 500)
    const windGain = context.createGain()
    windGain.gain.value = 0.05
    wobble(context, windGain.gain, 0.11, 0.035)
    wind.connect(windFilter).connect(windGain).connect(this.output)

    // Dế (chỉ buổi tối): tiếng cao rung nhanh
    const cricket = context.createOscillator()
    cricket.frequency.value = 4300
    const cricketPulse = context.createGain()
    cricketPulse.gain.value = 0
    wobble(context, cricketPulse.gain, 28, 1)
    this.cricketGain = context.createGain()
    this.cricketGain.gain.value = 0
    cricket.connect(cricketPulse).connect(this.cricketGain).connect(this.output)
    cricket.start()

    this.scheduleMotorbike()
    this.scheduleBird()
  }

  setNight(night) {
    this.night = night
    this.cricketGain.gain.setTargetAtTime(night ? 0.012 : 0, this.context.currentTime, 1)
  }

  later(seconds, callback) {
    this.timers.push(setTimeout(callback, seconds * 1000))
  }

  /** Một chiếc xe máy chạy ngang: tiếng máy (sóng răng cưa) + tiếng gió, to dần rồi nhỏ dần, lia trái → phải. */
  scheduleMotorbike() {
    this.later(between(MOTORBIKE_GAP), () => {
      const { context } = this
      const now = context.currentTime
      const duration = between([3, 5])
      const direction = Math.random() < 0.5 ? 1 : -1

      const engine = context.createOscillator()
      engine.type = 'sawtooth'
      const pitch = between([75, 115])
      engine.frequency.setValueAtTime(pitch * 1.08, now)
      engine.frequency.linearRampToValueAtTime(pitch * 0.9, now + duration) // hiệu ứng Doppler
      const engineFilter = context.createBiquadFilter()
      engineFilter.type = 'lowpass'
      engineFilter.frequency.value = 700

      const rush = loopNoise(context, this.noise)
      const rushFilter = context.createBiquadFilter()
      rushFilter.type = 'bandpass'
      rushFilter.frequency.value = 900

      const envelope = context.createGain()
      envelope.gain.setValueAtTime(0.0001, now)
      envelope.gain.exponentialRampToValueAtTime(between([0.09, 0.16]), now + duration * 0.5)
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)
      const pan = context.createStereoPanner()
      pan.pan.setValueAtTime(-0.9 * direction, now)
      pan.pan.linearRampToValueAtTime(0.9 * direction, now + duration)

      engine.connect(engineFilter).connect(envelope)
      const rushGain = context.createGain()
      rushGain.gain.value = 0.6
      rush.connect(rushFilter).connect(rushGain).connect(envelope)
      envelope.connect(pan).connect(this.output)
      engine.start(now)
      engine.stop(now + duration)
      rush.stop(now + duration)
      this.scheduleMotorbike()
    })
  }

  /** Chim hót (ban ngày): vài tiếng líu lo ngắn, cao độ trượt nhanh. */
  scheduleBird() {
    this.later(between(BIRD_GAP), () => {
      if (!this.night) {
        const { context } = this
        const start = context.currentTime
        const notes = 2 + Math.floor(Math.random() * 4)
        const base = between([2600, 4200])
        const pan = context.createStereoPanner()
        pan.pan.value = between([-0.8, 0.8])
        pan.connect(this.output)
        for (let n = 0; n < notes; n++) {
          const t = start + n * between([0.11, 0.18])
          const chirp = context.createOscillator()
          chirp.frequency.setValueAtTime(base, t)
          chirp.frequency.exponentialRampToValueAtTime(base * between([1.2, 1.6]), t + 0.07)
          const envelope = context.createGain()
          envelope.gain.setValueAtTime(0.0001, t)
          envelope.gain.exponentialRampToValueAtTime(0.025, t + 0.015)
          envelope.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
          chirp.connect(envelope).connect(pan)
          chirp.start(t)
          chirp.stop(t + 0.1)
        }
      }
      this.scheduleBird()
    })
  }

  dispose() {
    this.timers.forEach(clearTimeout)
    this.output.disconnect()
  }
}
