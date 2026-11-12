import { Suspense, lazy } from 'react'
import { useCafeStore } from './store.js'
import { loadCafeCanvas } from './scene/loadCafeCanvas.js'
import Landing from './ui/Landing.jsx'

const CafeCanvas = lazy(loadCafeCanvas)

export default function App() {
  const entered = useCafeStore((state) => state.entered)

  return (
    <>
      {entered && (
        <Suspense fallback={null}>
          <CafeCanvas />
        </Suspense>
      )}
      <Landing />
    </>
  )
}
