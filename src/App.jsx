import { Suspense, lazy } from 'react'
import { useCafeStore } from './store.js'
import { loadCafeCanvas } from './scene/loadCafeCanvas.js'
import { loadCharacterSelect } from './ui/characterSelect/loadCharacterSelect.js'
import Landing from './ui/Landing.jsx'

const CafeCanvas = lazy(loadCafeCanvas)
const CharacterSelect = lazy(loadCharacterSelect)

export default function App() {
  const choosing = useCafeStore((state) => state.choosing)
  const entered = useCafeStore((state) => state.entered)

  return (
    <>
      {entered && (
        <Suspense fallback={null}>
          <CafeCanvas />
        </Suspense>
      )}
      {choosing && (
        <Suspense fallback={<div className="char-select-backdrop" />}>
          <CharacterSelect />
        </Suspense>
      )}
      <Landing />
    </>
  )
}
