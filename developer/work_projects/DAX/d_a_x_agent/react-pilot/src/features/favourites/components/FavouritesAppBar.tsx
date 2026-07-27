import { useTranslation } from 'react-i18next'
import type { Shop } from '../types'
import { Icon } from '../../../shared/Icon'
import './FavouritesAppBar.css'

// Ports lib/pages/favourites/components/favourites_app_bar.dart
export function FavouritesAppBar({ shop, onBack }: { shop: Shop; onBack: () => void }) {
  const { t } = useTranslation()
  return (
    <header className="favourites-app-bar">
      <button type="button" className="favourites-app-bar__back" aria-label={t('common_back')} onClick={onBack}>
        {/* Icons.arrow_back_ios_new */}
        <Icon name="arrow_back_ios_new" />
      </button>
      <div className="favourites-app-bar__title-group">
        <h1 className="favourites-app-bar__title">{t('favourites_title')}</h1>
        <span className="favourites-app-bar__subtitle">{shop.nameShop}</span>
      </div>
      <div className="favourites-app-bar__spacer" />
    </header>
  )
}
