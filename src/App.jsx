import { Suspense, lazy } from 'react'
import { useCafeStore } from './store.js'
import { loadCafeCanvas } from './scene/loadCafeCanvas.js'
import { loadCharacterSelect } from './ui/characterSelect/loadCharacterSelect.js'
import Landing from './ui/Landing.jsx'

const CafeCanvas = lazy(loadCafeCanvas)
const CharacterSelect = lazy(loadCharacterSelect)
const PrivacyPage = lazy(() => import('./pages/privacy/PrivacyPage.jsx'))

// Trang phụ không cần thư viện định tuyến: Cloudflare Pages (không có 404.html) và Vite dev
// đều trả index.html cho mọi đường dẫn, ở đây chọn trang theo pathname.
const IS_PRIVACY_PAGE = window.location.pathname.replace(/\/+$/, '') === '/privacy'

export default function App() {
  const choosing = useCafeStore((state) => state.choosing)
  const changingCharacter = useCafeStore((state) => state.changingCharacter)
  const entered = useCafeStore((state) => state.entered)

  if (IS_PRIVACY_PAGE) {
    return (
      <Suspense fallback={null}>
        <PrivacyPage />
      </Suspense>
    )
  }

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
