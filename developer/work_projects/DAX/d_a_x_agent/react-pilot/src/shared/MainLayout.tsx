import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import './MainLayout.css'

// Wraps the four pages that reference NavbarWidget in the Dart source
// (main, orders, messages, settings) so the bottom nav bar persists across them.
export function MainLayout() {
  return (
    <div className="main-layout">
      <div className="main-layout__content">
        <Outlet />
      </div>
      <Navbar />
    </div>
  )
}
