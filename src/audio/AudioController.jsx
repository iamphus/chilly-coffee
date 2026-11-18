import { useEffect } from 'react'
import { isNightTime } from '../scene/lightingPresets.js'
import { useCafeStore } from '../store.js'
import { audioEngine } from './audioEngine.js'

const pickAudioState = (state) => ({
  inside: state.inside,
  muted: state.muted,
  musicOn: state.musicOn,
  musicVolume: state.musicVolume,
  ambienceVolume: state.ambienceVolume,
  night: isNightTime(state.timeOfDay),
  rain: state.rain,
  headphones: state.headphones,
})

/** Bật âm thanh khi đã vào quán, rồi theo dõi store + đồng hồ máy để trộn lại (trong/ngoài quán, chim ban ngày / dế tối…). */
export default function AudioController() {
  useEffect(() => {
    audioEngine.set(pickAudioState(useCafeStore.getState()))
    audioEngine.start((track) => useCafeStore.setState({ nowPlaying: track }))
    const unsubscribe = useCafeStore.subscribe((state) => audioEngine.set(pickAudioState(state)))
    const clockTimer = setInterval(() => {
      audioEngine.set({ night: isNightTime(useCafeStore.getState().timeOfDay) })
    }, 60_000)
    return () => {
      clearInterval(clockTimer)
      unsubscribe()
      audioEngine.stop()
    }
  }, [])

  return null
}
