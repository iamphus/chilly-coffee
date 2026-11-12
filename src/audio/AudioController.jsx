import { useEffect } from 'react'
import { effectiveTimeOfDay } from '../scene/lightingPresets.js'
import { useCafeStore } from '../store.js'
import { audioEngine } from './audioEngine.js'

const pickAudioState = (state) => ({
  inside: state.inside,
  muted: state.muted,
  musicOn: state.musicOn,
  musicVolume: state.musicVolume,
  ambienceVolume: state.ambienceVolume,
  night: effectiveTimeOfDay(state.timeOfDay) === 'night',
  rain: state.rain,
})

/** Bật âm thanh khi đã vào quán, rồi theo dõi store để trộn lại (trong / ngoài quán, âm lượng…). */
export default function AudioController() {
  useEffect(() => {
    audioEngine.set(pickAudioState(useCafeStore.getState()))
    audioEngine.start((track) => useCafeStore.setState({ nowPlaying: track }))
    const unsubscribe = useCafeStore.subscribe((state) => audioEngine.set(pickAudioState(state)))
    return () => {
      unsubscribe()
      audioEngine.stop()
    }
  }, [])

  return null
}
