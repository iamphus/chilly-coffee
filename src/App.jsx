import { Suspense, lazy } from 'react'
import { useCafeStore } from './store.js'
import { loadCafeCanvas } from './scene/loadCafeCanvas.js'
import { loadCharacterSelect } from './ui/characterSelect/loadCharacterSelect.js'
import Landing from './ui/Landing.jsx'

const CafeCanvas = lazy(loadCafeCanvas)
const CharacterSelect = lazy(loadCharacterSelect)

export default function App() {
  const choosing = useCafeStore((state) => state.choosing)
  const changingCharacter = useCafeStore((state) => state.changingCharacter)
  const entered = useCafeStore((state) => state.entered)

  return (
    <>
      {entered && (
        <Suspense fallback={null}>
          <CafeCanvas />
        </Suspense>
      )}
      {(choosing || changingCharacter) && (
        <Suspense fallback={<div className="char-select-backdrop" />}>
          {/* key: đổi chế độ thì dựng lại màn chọn từ đầu */}
          <CharacterSelect key={changingCharacter ? 'change' : 'enter'} mode={changingCharacter ? 'change' : 'enter'} />
        </Suspense>
      )}
      <Landing />
    </>
  )
}
