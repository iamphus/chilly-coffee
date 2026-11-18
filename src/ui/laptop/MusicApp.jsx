import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { parseYoutubeUrl } from '../../audio/youtube/parseYoutubeUrl.js'
import { useYoutubeStore } from '../../audio/youtube/youtubeStore.js'
import { useCafeStore } from '../../store.js'

/** Nhạc riêng: dán link playlist / video YouTube; đeo tai nghe để nghe (trình phát nằm cạnh, xem YoutubePlayer). */
export default function MusicApp() {
  const { t } = useTranslation()
  const source = useYoutubeStore((state) => state.source)
  const setSource = useYoutubeStore((state) => state.setSource)
  const clearSource = useYoutubeStore((state) => state.clearSource)
  const headphones = useCafeStore((state) => state.headphones)
  const toggleHeadphones = useCafeStore((state) => state.toggleHeadphones)
  const [draft, setDraft] = useState('')
  const [invalid, setInvalid] = useState(false)
  const inputId = useId()
  const errorId = useId()

  const submit = (event) => {
    event.preventDefault()
    const parsed = parseYoutubeUrl(draft)
    if (!parsed) {
      setInvalid(true)
      return
    }
    setSource(parsed)
    setDraft('')
    setInvalid(false)
  }

  return (
    <section className="music" aria-labelledby="music-title">
      <header className="laptop-app__header">
        <h2 id="music-title">{t('laptop.apps.music')}</h2>
        <span>{t('laptop.music.saved')}</span>
      </header>

      <p className="music__lead">{t('laptop.music.lead')}</p>

      <form className="music__form" onSubmit={submit} noValidate>
        <label htmlFor={inputId} className="music__label">
          {t('laptop.music.linkLabel')}
        </label>
        <div className="music__row">
          <input
            id={inputId}
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={draft}
            maxLength={500}
            aria-invalid={invalid}
            aria-describedby={invalid ? errorId : undefined}
            onChange={(event) => {
              setDraft(event.target.value)
              setInvalid(false)
            }}
          />
          <button type="submit" className="laptop-button laptop-button--primary" disabled={!draft.trim()}>
            {source ? t('laptop.music.replace') : t('laptop.music.save')}
          </button>
        </div>
        {invalid && (
          <p id={errorId} className="music__error" role="alert">
            {t('laptop.music.invalid')}
          </p>
        )}
      </form>

      {source ? (
        <div className="music__current">
          <p>
            <strong>{t(`laptop.music.type.${source.type}`)}</strong>
            <code>{source.id}</code>
          </p>
          <div className="music__actions">
            <button type="button" className="laptop-button laptop-button--primary" onClick={toggleHeadphones} aria-pressed={headphones}>
              {headphones ? t('laptop.music.takeOff') : t('laptop.music.putOn')}
              <kbd>H</kbd>
            </button>
            <button type="button" className="laptop-button" onClick={clearSource}>
              {t('laptop.music.remove')}
            </button>
          </div>
        </div>
      ) : (
        <p className="laptop-empty">{t('laptop.music.empty')}</p>
      )}

      <p className="music__legal">
        {t('laptop.music.legal')}{' '}
        <a href="/privacy" target="_blank" rel="noopener">
          {t('privacy.linkLabel')}
        </a>
      </p>
    </section>
  )
}
