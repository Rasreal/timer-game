import './Icon.css'

// Renders a classic Material Icons glyph by name — the same font family
// Flutter's Icons.* constants come from. Flutter's plain Icons.x is the
// filled family, Icons.x_outlined the outlined one, Icons.x_rounded the
// round one; pass `filled` / `variant` accordingly. Ligature names are the
// base name without the variant suffix ("settings", not "settings_outlined").
// The app's custom icon fonts (lib/flutter_flow/custom_icons.dart) are
// rendered by FFIcon instead.
const VARIANT_CLASS = {
  filled: 'material-icons',
  outlined: 'material-icons-outlined',
  round: 'material-icons-round',
  sharp: 'material-icons-sharp',
} as const

export function Icon({
  name,
  size = 24,
  color,
  className,
  filled = false,
  variant,
}: {
  name: string
  size?: number
  color?: string
  className?: string
  filled?: boolean
  variant?: keyof typeof VARIANT_CLASS
}) {
  const family = VARIANT_CLASS[variant ?? (filled ? 'filled' : 'outlined')]
  return (
    <span
      className={`${family} app-icon ${className ?? ''}`}
      style={{ fontSize: size, color }}
      aria-hidden
    >
      {name}
    </span>
  )
}
