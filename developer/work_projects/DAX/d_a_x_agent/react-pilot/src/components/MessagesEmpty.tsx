import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import './MessagesEmpty.css'

export function MessagesEmpty() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="messages-empty">
      <img
        className="messages-empty__icon"
        src="/images/messages-empty-icon.png"
        width={96}
        height={96}
        alt=""
      />
      <p className="messages-empty__text">{t('empty')}</p>
      <button
        type="button"
        className="messages-empty__continue"
        onClick={() => navigate('/main')}
      >
        {t('common_continue')}
      </button>
    </div>
  )
}
