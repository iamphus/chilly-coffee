import { useTranslation } from 'react-i18next'
import { HEADPHONES_ICON } from './headphonesIcon.jsx'

/** Biểu tượng tai nghe nhỏ trên bảng tên: người này đang đeo tai nghe, "đừng làm phiền". */
export default function HeadphonesBadge() {
  const { t } = useTranslation()
  return (
    <span className="name-tag__headphones" title={t('net.status.headphones')}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {HEADPHONES_ICON}
      </svg>
    </span>
  )
}
