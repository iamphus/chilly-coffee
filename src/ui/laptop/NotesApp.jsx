import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusStore } from '../../focus/focusStore.js'

export default function NotesApp() {
  const { t } = useTranslation()
  const notes = useFocusStore((state) => state.notes)
  const setNotes = useFocusStore((state) => state.setNotes)
  const id = useId()

  return (
    <section className="notes" aria-labelledby="notes-title">
      <header className="laptop-app__header">
        <h2 id="notes-title">{t('laptop.apps.notes')}</h2>
        <span>{t('laptop.notes.autosave')}</span>
      </header>
      <label htmlFor={id} className="visually-hidden">
        {t('laptop.notes.label')}
      </label>
      <textarea id={id} value={notes} maxLength={20_000} onChange={(event) => setNotes(event.target.value)} />
    </section>
  )
}
