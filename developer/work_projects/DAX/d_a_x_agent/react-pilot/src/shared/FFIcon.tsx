import './FFIcon.css'

// Renders the app's real custom icon-font glyphs (lib/flutter_flow/custom_icons.dart,
// FFIcons.*) using the original .ttf files copied from assets/fonts into
// public/fonts. Each entry is [font-family, codepoint] exactly as declared in
// the Dart IconData constants — pixel-identical to the Flutter app, unlike the
// Material Symbols approximations used before.
const GLYPHS = {
  // Google family (google.ttf)
  qrCodeScanner: ['Google', 0xe909],
  delete: ['Google', 0xe900],
  favorite: ['Google', 0xe901],
  home: ['Google', 0xe902],
  orderApprove: ['Google', 0xe903],
  receipt: ['Google', 0xe904],
  shoppingBag: ['Google', 0xe905],
  shoppingCart: ['Google', 0xe906],
  shoppingCartOff: ['Google', 0xe907],
  storefront: ['Google', 0xe908],
  // Icomoon (icomoon.ttf)
  icons8Pint1001: ['Icomoon', 0xe900],
  icons8Vodka64: ['Icomoon', 0xe901],
  icons8WineBar50: ['Icomoon', 0xe902],
  icons850: ['Icomoon', 0xe903],
  icons8501: ['Icomoon', 0xe904],
  icons864: ['Icomoon', 0xe905],
  icons8641: ['Icomoon', 0xe906],
  // MenuIcons (menuIcons.ttf)
  user: ['MenuIcons', 0xe907],
  // MySet (MySet.ttf)
  icons8Refresh: ['MySet', 0xe900],
  icons8Search: ['MySet', 0xe901],
  location: ['MySet', 0xe902],
  // Mic (Mic.ttf)
  mic: ['Mic', 0xe903],
  // Alk (alk.ttf)
  icons8Ratio32: ['Alk', 0xe900],
  icons8Bottle32: ['Alk', 0xe901],
  // Splash (splash.ttf)
  icons8FastCart64: ['Splash', 0xe900],
  icons8FastCart642: ['Splash', 0xe901],
  icons8FastCart90: ['Splash', 0xe902],
  icons8FastCart96: ['Splash', 0xe903],
  icons8FastCart961: ['Splash', 0xe904],
  icons8FastCart100: ['Splash', 0xe905],
  icons8Shop64: ['Splash', 0xe906],
  // SplashIco (splash_ico.ttf)
  icons8FastCart64White: ['SplashIco', 0xe907],
  icons8FastCart64White1: ['SplashIco', 0xe908],
} as const

export type FFIconName = keyof typeof GLYPHS

export function FFIcon({
  name,
  size = 24,
  color,
  className,
}: {
  name: FFIconName
  size?: number
  color?: string
  className?: string
}) {
  const [family, codepoint] = GLYPHS[name]
  return (
    <span
      className={`ff-icon ${className ?? ''}`}
      style={{ fontFamily: family, fontSize: size, color }}
      aria-hidden
    >
      {String.fromCodePoint(codepoint)}
    </span>
  )
}
