import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter-tight/400.css'
import '@fontsource/inter-tight/500.css'
import '@fontsource/inter-tight/600.css'
// GoogleFonts.outfit — used by AuthUtils.buildInfoText/buildModalHeader,
// the profile edit form, and the database-connection sheet.
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
// GoogleFonts.plusJakartaSans — order-card status badges + calendar filter.
import '@fontsource/plus-jakarta-sans/500.css'
// GoogleFonts.figtree — order-details sheet section labels + profile form field labels.
import '@fontsource/figtree/500.css'
import '@fontsource/figtree/600.css'
// Classic Material Icons — the font Flutter's Icons.* constants map to.
// Filled = plain Icons.x, outlined = Icons.x_outlined, round = Icons.x_rounded.
import 'material-icons/iconfont/filled.css'
import 'material-icons/iconfont/outlined.css'
import 'material-icons/iconfont/round.css'
import 'material-icons/iconfont/sharp.css'
import './index.css'
import './theme/theme.css'
import './i18n'
import { DynamicSupabaseService } from './features/auth/dynamicSupabaseService'
import App from './App.tsx'

DynamicSupabaseService.instance.loadSavedState()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
