import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useTranslation } from 'react-i18next'
import { PLAYABLE_CHARACTERS } from '../../characters/playableCharacters.js'
import { useCafeStore } from '../../store.js'
import CharacterLineup from './CharacterLineup.jsx'
import './characterSelect.css'

const LEAVE_DURATION_MS = 700 // khớp với transition của .char-select--leaving
const COUNT = PLAYABLE_CHARACTERS.length
const wrap = (index) => (index + COUNT) % COUNT

const isTyping = (target) => target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)

/**
 * Màn chọn nhân vật.
 * - mode 'enter': sau khi bấm "Vào quán" ở landing. Chọn xong thì dựng cảnh quán phía sau (nút hiện
 *   tiến độ); cảnh sẵn sàng thì màn này mờ dần rồi gỡ hẳn.
 * - mode 'change': đổi nhân vật khi đang ở trong quán (bấm chấm màu ở góc phải); có nút Huỷ / Esc.
 */
export default function CharacterSelect({ mode = 'enter' }) {
  const changing = mode === 'change'
  const { t } = useTranslation()
  const savedCharacter = useCafeStore((state) => state.characterId)
  const entered = useCafeStore((state) => state.entered)
  const sceneReady = useCafeStore((state) => state.sceneReady)
  const loadProgress = useCafeStore((state) => state.loadProgress)
  const enterCafe = useCafeStore((state) => state.enterCafe)
  const changeCharacter = useCafeStore((state) => state.changeCharacter)
  const closeCharacterChange = useCafeStore((state) => state.closeCharacterChange)
  const finishChoosing = useCafeStore((state) => state.finishChoosing)
  const [selected, setSelected] = useState(() => Math.max(0, PLAYABLE_CHARACTERS.indexOf(savedCharacter)))
  const [gone, setGone] = useState(false)

  const characterId = PLAYABLE_CHARACTERS[selected]
  const leaving = !changing && entered && sceneReady
  const locked = !changing && entered // đã bấm vào quán, đang chờ dựng cảnh
  const confirm = (id) => (changing ? changeCharacter(id) : enterCafe(id))

  // ← → (hoặc A D) để đổi nhân vật, Enter để chọn, Esc để huỷ (khi đổi trong quán)
  useEffect(() => {
    if (locked) return
    const onKey = (event) => {
      if (isTyping(event.target)) return
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') setSelected((index) => wrap(index - 1))
      else if (event.code === 'ArrowRight' || event.code === 'KeyD') setSelected((index) => wrap(index + 1))
      else if (event.code === 'Enter' && !event.repeat) confirm(PLAYABLE_CHARACTERS[selected])
      else if (event.code === 'Escape' && changing) closeCharacterChange()
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    if (!leaving) return
    const timer = setTimeout(() => {
      setGone(true)
      finishChoosing()
    }, LEAVE_DURATION_MS)
    return () => clearTimeout(timer)
  }, [leaving, finishChoosing])

  if (gone) return null

  const percent = Math.round(loadProgress)
  // Chỉ hiện % khi đang tải thật; 0% (chưa kịp đo) hoặc 100% (đang dựng cảnh) thì chỉ hiện chữ
  const enterLabel = changing
    ? t('select.change')
    : !entered
      ? t('select.enter')
    : percent > 0 && percent < 100
      ? t('landing.loading', { percent })
      : t('landing.preparing')
  const name = t(`characters.${characterId}`)

  return (
    <div className={leaving ? 'char-select char-select--leaving' : 'char-select'}>
      <Canvas
        className="char-select__canvas"
        dpr={[1, 1.5]}
        gl={{ alpha: true }}
        camera={{ fov: 32, near: 0.1, far: 40, position: [0, 1.0, 4.6] }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 0.95
        }}
      >
        <Suspense fallback={null}>
          <CharacterLineup selected={selected} onSelect={locked ? () => {} : setSelected} />
        </Suspense>
      </Canvas>

      <header className="char-select__header">
        <h1>{t('select.title')}</h1>
        <p>{t('select.subtitle')}</p>
      </header>

      <div className="char-select__panel">
        <div className="char-select__picker">
          <button
            type="button"
            className="char-select__arrow"
            onClick={() => setSelected((index) => wrap(index - 1))}
            disabled={locked}
            aria-label={t('select.previous')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <div className="char-select__name" aria-live="polite">
            <strong>{name}</strong>
            <span>{t('select.count', { current: selected + 1, total: COUNT })}</span>
          </div>
          <button
            type="button"
            className="char-select__arrow"
            onClick={() => setSelected((index) => wrap(index + 1))}
            disabled={locked}
            aria-label={t('select.next')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="char-select__actions">
          {changing && (
            <button type="button" className="char-select__cancel" onClick={closeCharacterChange}>
              {t('select.cancel')}
            </button>
          )}
          <button
            type="button"
            className="btn-enter"
            onClick={() => confirm(characterId)}
            disabled={locked}
            aria-busy={locked && !sceneReady}
            style={{ '--progress': `${percent}%` }}
          >
            {enterLabel}
          </button>
        </div>
        <p className="char-select__hint">{t(changing ? 'select.hintChange' : 'select.hint')}</p>
      </div>
    </div>
  )
}
