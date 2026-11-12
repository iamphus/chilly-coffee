import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import viCommon from './locales/vi/common.json'
import enCommon from './locales/en/common.json'

i18n.use(initReactI18next).init({
  resources: {
    vi: { common: viCommon },
    en: { common: enCommon },
  },
  lng: 'vi',
  fallbackLng: 'vi',
  defaultNS: 'common',
  interpolation: { escapeValue: false }, // React đã tự escape
})

export default i18n
