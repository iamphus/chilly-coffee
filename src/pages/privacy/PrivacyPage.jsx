import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './privacyPage.css'

/** Đặt <title> và <meta name="description"> riêng cho trang (theo ngôn ngữ đang chọn). */
function useDocumentMeta(title, description) {
  useEffect(() => {
    document.title = title
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  }, [title, description])
}

/** Trang /privacy: chính sách riêng tư (YouTube yêu cầu với trang có nhúng trình phát). */
export default function PrivacyPage() {
  const { t, i18n } = useTranslation()
  const sections = t('privacy.sections', { returnObjects: true })
  useDocumentMeta(t('privacy.metaTitle'), t('privacy.metaDescription'))

  useEffect(() => {
    document.documentElement.lang = i18n.language
  }, [i18n.language])

  return (
    <div className="privacy">
      <header className="privacy__header">
        <a className="privacy__back" href="/">
          ← {t('privacy.back')}
        </a>
        <button type="button" className="privacy__language" onClick={() => i18n.changeLanguage(t('privacy.switchLanguageCode'))}>
          {t('privacy.switchLanguage')}
        </button>
      </header>

      <main className="privacy__main">
        <article>
          <h1>{t('privacy.title')}</h1>
          <p className="privacy__updated">{t('privacy.updated')}</p>
          <p className="privacy__intro">{t('privacy.intro')}</p>

          {Array.isArray(sections) &&
            sections.map((section) => (
              <section key={section.title}>
                <h2>{section.title}</h2>
                {section.paragraphs?.map((text) => (
                  <p key={text}>{text}</p>
                ))}
                {section.items && (
                  <ul>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {section.after?.map((text) => (
                  <p key={text}>{text}</p>
                ))}
                {section.links && (
                  <ul className="privacy__links">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        <a href={link.href} target="_blank" rel="noopener noreferrer">
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
        </article>
      </main>
    </div>
  )
}
