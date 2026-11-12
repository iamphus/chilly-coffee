import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { nameTagAnchor } from '../player/nameTagAnchor.js'
import { useCafeStore } from '../store.js'

/** Bảng tên trên đầu nhân vật người chơi: chấm "Tôi" + tên; cỡ chữ không đổi khi zoom. */
export default function NameTag() {
  const { t } = useTranslation()
  const nickname = useCafeStore((state) => state.nickname)
  const tag = useRef(null)

  useEffect(() => {
    let frame = 0
    const follow = () => {
      const element = tag.current
      if (element) {
        element.style.opacity = nameTagAnchor.visible ? '1' : '0'
        element.style.transform = `translate(${nameTagAnchor.x}px, ${nameTagAnchor.y}px) translate(-50%, -100%)`
      }
      frame = requestAnimationFrame(follow)
    }
    frame = requestAnimationFrame(follow)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div ref={tag} className="name-tag" aria-hidden="true">
      <span className="name-tag__me">{t('game.me')}</span>
      {nickname}
    </div>
  )
}
