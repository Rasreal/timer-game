import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { MessagesEmpty } from '../components/MessagesEmpty'
import { Icon } from '../shared/Icon'
import './MessagesPage.css'

export function MessagesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="messages-page">
      <header className="messages-page__app-bar">
        <button
          type="button"
          className="messages-page__back"
          aria-label={t('common_back')}
          onClick={() => navigate('/main')}
        >
          {/* Icons.arrow_back_ios_new */}
          <Icon name="arrow_back_ios_new" />
        </button>
        <h1 className="messages-page__title">{t('nav_messages')}</h1>
        <div className="messages-page__spacer" />
      </header>
      <main className="messages-page__body">
        <MessagesEmpty />
      </main>
    </div>
  )
}
