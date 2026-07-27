import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore, DEMO_USER_PHONE } from '../features/auth/authStore'
import { getShopById } from '../features/main/api'
import { DEMO_SHOP } from '../features/favourites/demoData'
import { Icon } from '../shared/Icon'
import './ConfirmedOrderPage.css'

// Ports lib/administration/main/confirmed_order/confirmed_order_widget.dart.
// The Dart widget hardcodes "Заказ № N" / "успешно оформлен" as Russian
// literals, but the app's localization table ships the same strings under
// order_number / order_created_success (with kk/en variants), so this port
// runs them through t() like every other user-visible string. Both the back
// arrow and "Продолжить" replace the stack with /main in the Dart original
// (context.goNamed), ported here as navigate('/main', { replace: true }).
export function ConfirmedOrderPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const shopId = Number(params.get('shopId')) || DEMO_SHOP.id
  const orderNumber = params.get('orderNumber') ?? ''
  const userId = useAuthStore((s) => s.userId)
  const isDemo = userId === DEMO_USER_PHONE || shopId === DEMO_SHOP.id

  const [shopName, setShopName] = useState(isDemo ? DEMO_SHOP.nameShop : '')

  useEffect(() => {
    if (isDemo) {
      setShopName(DEMO_SHOP.nameShop)
      return
    }
    let cancelled = false
    getShopById(shopId)
      .then((shop) => {
        if (!cancelled) setShopName(shop?.nameShop ?? '')
      })
      .catch(() => {
        if (!cancelled) setShopName('')
      })
    return () => {
      cancelled = true
    }
  }, [isDemo, shopId])

  const goToMain = () => navigate('/main', { replace: true })

  return (
    <div className="confirmed-order-page">
      <header className="confirmed-order-page__app-bar">
        <button type="button" className="confirmed-order-page__back" aria-label={t('common_back')} onClick={goToMain}>
          <Icon name="arrow_back_ios_new" color="#FF6300" />
        </button>
        <h1 className="confirmed-order-page__title">{shopName}</h1>
        <div className="confirmed-order-page__spacer" />
      </header>

      <main className="confirmed-order-page__body">
        {/* Dart: ClipRRect(borderRadius: 8) > Image.asset('assets/images/
            icons8-checkmark-100.png', width: 96, height: 96) — the identical
            asset ships in public/images/, so use it directly instead of
            approximating with a border-circle + icon glyph. */}
        <img
          className="confirmed-order-page__check"
          src="/images/icons8-checkmark-100.png"
          alt=""
          width={96}
          height={96}
        />
        <p className="confirmed-order-page__message">
          {t('order_number')} {orderNumber || 'null'}
          <br />
          {t('order_created_success')}
        </p>
        <button type="button" className="confirmed-order-page__continue" onClick={goToMain}>
          {t('common_continue')}
        </button>
      </main>
    </div>
  )
}
