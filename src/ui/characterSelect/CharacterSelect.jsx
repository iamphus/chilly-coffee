import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useTranslation } from 'react-i18next'
import { audioEngine } from '../../audio/audioEngine.js'
import { isPresetAppearance, presetAppearance } from '../../characters/appearance.js'
import { PLAYABLE_CHARACTERS } from '../../characters/playableCharacters.js'
import { MAX_NICKNAME_LENGTH, useCafeStore } from '../../store.js'
import CharacterLineup from './CharacterLineup.jsx'
import WardrobePanel from './WardrobePanel.jsx'
import './characterSelect.css'

const LEAVE_DURATION_MS = 700 // khớp với transition của .char-select--leaving
const COUNT = PLAYABLE_CHARACTERS.length
const wrap = (index) => (index + COUNT) % COUNT

const isTyping = (target) => target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)

/**
 * Màn chọn & phối đồ nhân vật (kèm đặt tên hiển thị).
 * - mode 'enter': sau khi bấm "Vào quán" ở landing. Chọn xong thì dựng cảnh quán phía sau (nút hiện
 *   tiến độ); cảnh sẵn sàng thì màn này mờ dần rồi gỡ hẳn.
 * - mode 'change': đổi nhân vật / trang phục khi đang ở trong quán (bấm chấm màu ở góc phải); có nút Huỷ / Esc.
 */
export default function CharacterSelect({ mode = 'enter' }) {
  const changing = mode === 'change'
  const { t } = useTranslation()
  const savedAppearance = useCafeStore((state) => state.appearance)
  const nickname = useCafeStore((state) => state.nickname)
  const setNickname = useCafeStore((state) => state.setNickname)
  const randomizeNickname = useCafeStore((state) => state.randomizeNickname)
  const entered = useCafeStore((state) => state.entered)
  const sceneReady = useCafeStore((state) => state.sceneReady)
  const loadProgress = useCafeStore((state) => state.loadProgress)
  const enterCafe = useCafeStore((state) => state.enterCafe)
  const changeCharacter = useCafeStore((state) => state.changeCharacter)
  const closeCharacterChange = useCafeStore((state) => state.closeCharacterChange)
  const finishChoosing = useCafeStore((state) => state.finishChoosing)

  const [selected, setSelected] = useState(() => Math.max(0, PLAYABLE_CHARACTERS.indexOf(savedAppearance.base)))
  const [appearance, setAppearance] = useState(savedAppearance)
  const [customizing, setCustomizing] = useState(() => !isPresetAppearance(savedAppearance))
  const [nameDraft, setNameDraft] = useState(nickname)
  const [gone, setGone] = useState(false)
  const rootRef = useRef(null)
  const headerRef = useRef(null)
  const wardrobeRef = useRef(null)
  const panelRef = useRef(null)
  const layoutRef = useRef(null) // vị trí tủ đồ cho camera (xem CameraRig)

  const characterId = PLAYABLE_CHARACTERS[selected]
  const leaving = !changing && entered && sceneReady
  const locked = !changing && entered // đã bấm vào quán, đang chờ dựng cảnh

  const pickPreset = (nextIndex) => {
    if (locked) return
    const wrapped = wrap(nextIndex)
    const nextId = PLAYABLE_CHARACTERS[wrapped]
    setSelected(wrapped)
    setAppearance(presetAppearance(nextId))
  }

  const confirm = () => {
    setNickname(nameDraft)
    audioEngine.unlock()
    if (changing) changeCharacter(characterId, appearance)
    else enterCafe(characterId, appearance)
  }

  // ← → (hoặc A D) để đổi mẫu nhân vật, Enter để chọn, Esc để đóng tủ đồ / huỷ
  useEffect(() => {
    if (locked) return undefined
    const onKey = (event) => {
      if (isTyping(event.target)) return
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') pickPreset(selected - 1)
      else if (event.code === 'ArrowRight' || event.code === 'KeyD') pickPreset(selected + 1)
      else if (event.code === 'Enter' && !event.repeat) confirm()
      else if (event.code === 'Escape') {
        if (customizing && !changing) setCustomizing(false)
        else if (changing) closeCharacterChange()
        else return
      } else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Tủ đồ ở cột phải (màn ngang) hay là ngăn kéo dưới (màn dọc / hẹp, theo CSS): báo cho camera
  // phần trống còn lại để đặt nhân vật vào đó. Đo lại khi đổi kích thước cửa sổ, đổi tab tủ đồ…
  useLayoutEffect(() => {
    const root = rootRef.current
    const wardrobe = wardrobeRef.current
    if (!customizing || !root || !wardrobe) {
      layoutRef.current = null
      return undefined
    }
    const measure = () => {
      const box = root.getBoundingClientRect()
      const drawer = wardrobe.getBoundingClientRect()
      const header = headerRef.current?.getBoundingClientRect()
      const offCenter = drawer.left + drawer.width / 2 - (box.left + box.width / 2)
      layoutRef.current =
        offCenter > box.width * 0.1
          ? { layout: 'side' }
          : { layout: 'drawer', top: (header ? header.bottom : box.top) - box.top, bottom: drawer.top - box.top }
    }
    measure()
    const observer = new ResizeObserver(measure)
    for (const element of [root, wardrobe, headerRef.current, panelRef.current]) if (element) observer.observe(element)
    return () => {
      observer.disconnect()
      layoutRef.current = null
    }
  }, [customizing])

  useEffect(() => {
    if (!leaving) return undefined
    const timer = setTimeout(() => {
      setGone(true)
      finishChoosing()
    }, LEAVE_DURATION_MS)
    return () => clearTimeout(timer)
  }, [leaving, finishChoosing])

  if (gone) return null

  const percent = Math.round(loadProgress)
  const enterLabel = changing
    ? t('select.change')
    : !entered
      ? t('select.enter')
      : percent > 0 && percent < 100
        ? t('landing.loading', { percent })
        : t('landing.preparing')
  const baseName = t(`characters.${characterId}`)
  const modified = !isPresetAppearance(appearance)

  return (
    <div ref={rootRef} className={leaving ? 'char-select char-select--leaving' : 'char-select'}>
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
          <CharacterLineup selected={selected} onSelect={pickPreset} appearance={appearance} customizing={customizing} layoutRef={layoutRef} />
        </Suspense>
      </Canvas>

      <header ref={headerRef} className="char-select__header">
        <h1>{t('select.title')}</h1>
        <p>{t('select.subtitle')}</p>
      </header>

      {customizing && <WardrobePanel ref={wardrobeRef} appearance={appearance} onChange={setAppearance} disabled={locked} />}

      <div ref={panelRef} className="char-select__panel">
        <div className="char-select__top-row">
          <div className="char-select__nickname">
            <label htmlFor="char-select-nickname">{t('select.nicknameLabel')}</label>
            <input
              id="char-select-nickname"
              type="text"
              value={nameDraft}
              maxLength={MAX_NICKNAME_LENGTH}
              disabled={locked}
              autoComplete="off"
              spellCheck={false}
              placeholder={t('select.nicknamePlaceholder')}
              onChange={(event) => setNameDraft(event.target.value)}
              onBlur={() => setNameDraft(setNickname(nameDraft))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  event.currentTarget.blur()
                }
              }}
            />
            <button
              type="button"
              className="char-select__dice"
              onClick={() => setNameDraft(randomizeNickname())}
              disabled={locked}
              aria-label={t('select.randomName')}
              title={t('select.randomName')}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="4" width="16" height="16" rx="3" />
                <circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none" />
                <circle cx="15" cy="9" r="1.2" fill="currentColor" stroke="none" />
                <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
                <circle cx="9" cy="15" r="1.2" fill="currentColor" stroke="none" />
                <circle cx="15" cy="15" r="1.2" fill="currentColor" stroke="none" />
              </svg>
            </button>
          </div>

          <button
            type="button"
            className={customizing ? 'char-select__wardrobe-btn char-select__wardrobe-btn--open' : 'char-select__wardrobe-btn'}
            onClick={() => setCustomizing((open) => !open)}
            disabled={locked}
            aria-expanded={customizing}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 4a2 2 0 0 1 2 2c0 1.1-.9 1.6-2 2.4L4 14h16l-8-5.6" />
              <path d="M6 14v5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-5" />
            </svg>
            {t('select.wardrobe.toggle')}
          </button>
        </div>

        <div className="char-select__picker">
          <button
            type="button"
            className="char-select__arrow"
            onClick={() => pickPreset(selected - 1)}
            disabled={locked}
            aria-label={t('select.previous')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <div className="char-select__name" aria-live="polite">
            <strong>{modified ? `${baseName} · ${t('select.wardrobe.customBadge')}` : baseName}</strong>
            <span>{t('select.count', { current: selected + 1, total: COUNT })}</span>
          </div>
          <button
            type="button"
            className="char-select__arrow"
            onClick={() => pickPreset(selected + 1)}
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
            onClick={confirm}
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
