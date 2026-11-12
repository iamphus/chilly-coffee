import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MAX_CHAT_LENGTH } from '../net/chatFilter.js'
import { useNetStore } from '../net/netStore.js'
import { sendChat } from '../net/session.js'
import { useCafeStore } from '../store.js'

const isTyping = (target) => target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
const PREVIEW = 4 // số tin hiện khi khung chat đang đóng
const PREVIEW_MS = 12_000 // tin cũ hơn thì ẩn khỏi bản xem trước

/**
 * Khung chat ở góc trái dưới. Enter để mở và gõ, Enter để gửi, Esc để đóng.
 * Mỗi tin của người khác có nút "Chặn" để ẩn mọi tin và bong bóng của người đó.
 */
export default function ChatPanel() {
  const { t } = useTranslation()
  const messages = useNetStore((state) => state.messages)
  const open = useNetStore((state) => state.chatOpen)
  const setOpen = useNetStore((state) => state.setChatOpen)
  const blocked = useNetStore((state) => state.blocked)
  const block = useNetStore((state) => state.block)
  const unblockAll = useNetStore((state) => state.unblockAll)
  const peerCount = useNetStore((state) => Object.keys(state.peers).length)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const input = useRef(null)
  const list = useRef(null)

  // Enter (khi không gõ ở đâu khác) để mở khung chat
  useEffect(() => {
    const onKey = (event) => {
      if (event.code !== 'Enter' || isTyping(event.target) || useNetStore.getState().chatOpen) return
      if (useCafeStore.getState().changingCharacter) return
      event.preventDefault()
      setOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])

  useEffect(() => {
    if (open) input.current?.focus()
  }, [open])

  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight
  }, [messages, open])

  // Làm mới bản xem trước để tin cũ tự ẩn
  useEffect(() => {
    if (open) return
    const id = setInterval(() => setNow(Date.now()), 2000)
    return () => clearInterval(id)
  }, [open])

  const submit = (event) => {
    event.preventDefault()
    const problem = sendChat(draft)
    if (problem && problem !== 'empty') {
      setError(t(`net.chat.${problem}`))
      return
    }
    setError(null)
    setDraft('')
  }

  const onInputKey = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      setOpen(false)
      input.current?.blur()
    }
  }

  const visible = open ? messages : messages.filter((message) => now - message.at < PREVIEW_MS).slice(-PREVIEW)
  const blockedCount = Object.keys(blocked).length

  return (
    <section className={open ? 'chat chat--open' : 'chat'} aria-label={t('net.chat.label')}>
      {open && (
        <header className="chat__header">
          <span>{t('net.chat.title', { count: peerCount + 1 })}</span>
          {blockedCount > 0 && (
            <button type="button" className="chat__link" onClick={unblockAll}>
              {t('net.chat.unblockAll', { count: blockedCount })}
            </button>
          )}
        </header>
      )}

      <ol ref={list} className="chat__list" aria-live="polite">
        {visible.map((message) => (
          <li key={message.key} className={message.self ? 'chat__message chat__message--self' : 'chat__message'}>
            <strong>{message.self ? t('game.me') : message.name}</strong> {message.text}
            {open && !message.self && (
              <button type="button" className="chat__block" onClick={() => block(message.from, message.name)}>
                {t('net.chat.block')}
              </button>
            )}
          </li>
        ))}
      </ol>

      {open ? (
        <form className="chat__form" onSubmit={submit}>
          <label htmlFor="chat-input" className="visually-hidden">
            {t('net.chat.inputLabel')}
          </label>
          <input
            id="chat-input"
            ref={input}
            type="text"
            value={draft}
            maxLength={MAX_CHAT_LENGTH}
            autoComplete="off"
            placeholder={t('net.chat.placeholder')}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onInputKey}
          />
          <button type="submit" disabled={!draft.trim()}>
            {t('net.chat.send')}
          </button>
          {error && <p className="chat__error">{error}</p>}
        </form>
      ) : (
        <button type="button" className="chat__open" onClick={() => setOpen(true)}>
          {t('net.chat.open')} <kbd>Enter</kbd>
        </button>
      )}
    </section>
  )
}
