import { useEffect, useRef } from 'react'

const GAME_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ShiftLeft',
  'ShiftRight',
])

const isTyping = (target) => target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

/** Các phím di chuyển đang được giữ, theo `event.code` (không phụ thuộc bàn phím tiếng Việt / Telex). */
export function useKeyboard() {
  const pressed = useRef({})

  useEffect(() => {
    const down = (event) => {
      if (!GAME_KEYS.has(event.code) || isTyping(event.target)) return
      if (event.code.startsWith('Arrow')) event.preventDefault()
      pressed.current[event.code] = true
    }
    const up = (event) => {
      pressed.current[event.code] = false
    }
    const reset = () => {
      pressed.current = {}
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', reset)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', reset)
    }
  }, [])

  return pressed
}

/** Trục di chuyển từ các phím đang giữ: forward (W/S), turn (D/A), run (Shift). */
export function readAxes(keys) {
  const on = (code) => (keys[code] ? 1 : 0)
  return {
    forward: Math.max(on('KeyW'), on('ArrowUp')) - Math.max(on('KeyS'), on('ArrowDown')),
    side: Math.max(on('KeyD'), on('ArrowRight')) - Math.max(on('KeyA'), on('ArrowLeft')),
    run: keys.ShiftLeft || keys.ShiftRight,
  }
}
