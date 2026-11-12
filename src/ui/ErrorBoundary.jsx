import { Component } from 'react'
import { useTranslation } from 'react-i18next'

function ErrorScreen() {
  const { t } = useTranslation()

  return (
    <div className="overlay" role="alert">
      <h1>{t('error.title')}</h1>
      <p>{t('error.message')}</p>
      <button type="button" onClick={() => window.location.reload()}>
        {t('error.reload')}
      </button>
    </div>
  )
}

/** Bắt lỗi khi dựng giao diện hoặc cảnh 3D (không có WebGL, không tải được mô hình…). */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Chilly Coffee: lỗi khi hiển thị', error, info.componentStack)
  }

  render() {
    return this.state.error ? <ErrorScreen /> : this.props.children
  }
}
