import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import viCommon from './locales/vi/common.json'
import enCommon from './locales/en/common.json'

export const LANGUAGES = ['vi', 'en']
const DEFAULT_LANGUAGE = 'vi'
const LANGUAGE_KEY = 'chilly.lang'

/** 'en-US' → 'en'; trả về null nếu không phải ngôn ngữ đang hỗ trợ. */
const toSupported = (code) => {
  const base = String(code ?? '').toLowerCase().split('-')[0]
  return LANGUAGES.includes(base) ? base : null
}

/** Ưu tiên lựa chọn đã lưu, rồi tới ngôn ngữ trình duyệt, cuối cùng là tiếng Việt. */
function detectLanguage() {
  try {
    const saved = toSupported(localStorage.getItem(LANGUAGE_KEY))
    if (saved) return saved
  } catch {
    // localStorage bị chặn (ẩn danh…): dò theo trình duyệt
  }
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const code of preferred) {
    const supported = toSupported(code)
    if (supported) return supported
  }
  return DEFAULT_LANGUAGE
}

i18n.use(initReactI18next).init({
  resources: {
    vi: { common: viCommon },
    en: { common: enCommon },
  },
  lng: detectLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: LANGUAGES,
  defaultNS: 'common',
  interpolation: { escapeValue: false }, // React đã tự escape
})

document.documentElement.lang = i18n.language

// Mọi chỗ gọi i18n.changeLanguage() (Cài đặt, Landing, /privacy) đều được lưu lại để F5 / quay về quán không mất lựa chọn
i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language
  try {
    localStorage.setItem(LANGUAGE_KEY, language)
  } catch {
    // không lưu được thì lần sau dò lại theo trình duyệt
  }
})

export default i18n
