import { useTranslation } from 'react-i18next'
import type { Shop } from '../../favourites/types'
import { FFIcon } from '../../../shared/FFIcon'
import { Icon } from '../../../shared/Icon'
import './ShopCard.css'

// Ports lib/administration/main/shops/shop_item_main/shop_item_main_widget.dart
// (the full 390-line widget): name + address at top-left, a circular avatar
// showing the first letter of the shop's category/name at top-right, a thin
// divider, then a stats row — left column: storefront icon + shop code
// (line 1), social_distance icon + formatted distance (line 2, only rendered
// when distanceMeters is present); right column: home_work_outlined icon +
// codeCompany (warehouse code). No chevron in the Dart source.
function formatDistance(distanceMeters: number | undefined, unitM: string, unitKm: string): string | null {
  if (distanceMeters == null) return null
  if (distanceMeters < 1000) return `${distanceMeters.toFixed(0)} ${unitM}`
  return `${(distanceMeters / 1000).toFixed(1)} ${unitKm}`
}

export function ShopCard({ shop, onClick }: { shop: Shop; onClick: () => void }) {
  const { t } = useTranslation()
  const addressParts = [shop.streetShop, shop.houseShop].filter(Boolean).join(' ')
  const avatarLetter = (shop.categoryName || shop.nameShop || '-').trim().charAt(0).toUpperCase() || '-'
  const distanceLabel = formatDistance(shop.distanceMeters, t('unit_m'), t('unit_km'))

  return (
    <div className="shop-card" role="button" tabIndex={0} onClick={onClick}>
      <div className="shop-card__top">
        <div className="shop-card__info">
          <span className="shop-card__name">{shop.nameShop}</span>
          {addressParts && (
            <span className="shop-card__address">{`${t('shop_street_abbr')} ${addressParts}`}</span>
          )}
        </div>
        <div className="shop-card__avatar">
          <span>{avatarLetter}</span>
        </div>
      </div>

      <div className="shop-card__divider" />

      <div className="shop-card__stats">
        <div className="shop-card__stats-col">
          <div className="shop-card__stat-row">
            {/* FFIcons.kstorefront */}
            <FFIcon name="storefront" size={18} color="#a9a9a9" />
            <span>{shop.codeShop ?? '-'}</span>
          </div>
          {distanceLabel && (
            <div className="shop-card__stat-row">
              {/* Icons.social_distance (Material) */}
              <Icon name="social_distance" filled size={18} color="#a9a9a9" />
              <span>{distanceLabel}</span>
            </div>
          )}
        </div>
        <div className="shop-card__stats-divider" />
        <div className="shop-card__stats-col shop-card__stats-col--right">
          <div className="shop-card__stat-row">
            {/* Icons.home_work_outlined (Material) */}
            <Icon name="home_work" filled={false} size={18} color="#a9a9a9" />
            <span>{shop.codeCompany ?? '-'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
