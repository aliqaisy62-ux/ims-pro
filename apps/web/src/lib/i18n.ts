import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { ar, en } from '@ims-pro/i18n'

// ar.json and en.json from packages/i18n are the authoritative translation source.
// They are structured with namespaced keys (nav, auth, common, dashboard, …).
// We flatten them here under the single 'translation' namespace so that
// i18next can resolve them via t('nav.dashboard'), t('auth.logout'), etc.

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
    },
    lng: 'ar',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })
}

export default i18n
