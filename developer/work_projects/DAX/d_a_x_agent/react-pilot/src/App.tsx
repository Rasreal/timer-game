import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import { MessagesPage } from './pages/MessagesPage'
import { MainPage } from './pages/MainPage'
import { OrdersPage } from './pages/OrdersPage'
import { FavouritesPage } from './pages/FavouritesPage'
import { CartPage } from './pages/CartPage'
import { ShopOrdersPage } from './pages/ShopOrdersPage'
import { SettingsPage } from './pages/SettingsPage'
import { ProductsPage } from './pages/ProductsPage'
import { SelectCityPage } from './pages/SelectCityPage'
import { OrderPage } from './pages/OrderPage'
import { ConfirmedOrderPage } from './pages/ConfirmedOrderPage'
import { MapPage } from './pages/MapPage'
import { StartPage } from './pages/StartPage'
import { PhoneEnterPage } from './pages/PhoneEnterPage'
import { BinEnterPage } from './pages/BinEnterPage'
import { LoginCodeEnterPage } from './pages/LoginCodeEnterPage'
import { RegisterSheet } from './pages/RegisterSheet'
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage'
import { MainLayout } from './shared/MainLayout'
import { RequireAuth } from './shared/RequireAuth'
import { PwaInstallPrompt } from './features/pwa/PwaInstallPrompt'
import { useThemeMode } from './theme/useThemeMode'

// main/orders/messages/settings are the four pages that reference
// NavbarWidget in the Dart source (see shared/Navbar.tsx), so they're nested
// under MainLayout to keep the bottom nav bar visible across them. The other
// authenticated pages (favourites, cart, shopOrders, products, selectCityPage,
// order) are detail/drill-in pages reached via a back button, matching how
// the Dart app never attaches the navbar to those either. Everything under
// RequireAuth mirrors the Dart app's GoRouter auth-redirect guard.
//
// The auth sheet routes (phoneEnter/binEnter/loginCodeEnter/register) are
// each rendered by Dart as a bottom sheet stacked OVER StartPage (or the
// previous sheet), which stays mounted and dimmed behind it —
// AuthUtils.showAuthModal(context, ...). A plain <Route> swap loses that:
// navigating to /phoneEnter used to unmount StartPage entirely, leaving the
// sheet's backdrop over a blank page. Fixed with react-router's standard
// background-location modal pattern: StartPage.tsx / PhoneEnterPage.tsx /
// BinEnterPage.tsx navigate with `state: { backgroundLocation: location }`,
// so `background` below still resolves to /start (or whichever sheet came
// before) and gets rendered underneath the sheet's own <Routes>.
function AppRoutes({ background }: { background?: Location }) {
  return (
    <Routes location={background ?? undefined}>
      <Route path="/" element={<Navigate to="/main" replace />} />
      <Route element={<RequireAuth />}>
        <Route element={<MainLayout />}>
          <Route path="/main" element={<MainPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="/favourites" element={<FavouritesPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/shopOrders/:shopId" element={<ShopOrdersPage />} />
        <Route path="/products/:shopId" element={<ProductsPage />} />
        <Route path="/selectCityPage" element={<SelectCityPage />} />
        <Route path="/order" element={<OrderPage />} />
        <Route path="/confirmedOrder" element={<ConfirmedOrderPage />} />
        <Route path="/map" element={<MapPage />} />
      </Route>
      <Route path="/start" element={<StartPage />} />
      <Route path="/privacyPolicy" element={<PrivacyPolicyPage />} />
      {!background && (
        <>
          <Route path="/phoneEnter" element={<PhoneEnterPage />} />
          <Route path="/binEnter" element={<BinEnterPage />} />
          <Route path="/loginCodeEnter" element={<LoginCodeEnterPage />} />
          <Route path="/register" element={<RegisterSheet />} />
        </>
      )}
    </Routes>
  )
}

function App() {
  // Applies the persisted light/dark/system selection to <html data-theme>
  // (ports main.dart's themeMode: _themeMode on MaterialApp).
  useThemeMode()

  const location = useLocation()
  const state = location.state as { backgroundLocation?: Location } | null
  const background = state?.backgroundLocation

  return (
    <>
      <AppRoutes background={background} />
      {background && (
        <Routes>
          <Route path="/phoneEnter" element={<PhoneEnterPage />} />
          <Route path="/binEnter" element={<BinEnterPage />} />
          <Route path="/loginCodeEnter" element={<LoginCodeEnterPage />} />
          <Route path="/register" element={<RegisterSheet />} />
        </Routes>
      )}
      {/* PWA install sheet — Dart shows it from StartPage (and defines it on
          MainPage); mounted app-level here, self-triggers on /start & /main. */}
      <PwaInstallPrompt />
    </>
  )
}

export default App
