import { FFIcon } from '../../../shared/FFIcon'
import './CartFloatingActionButton.css'

// Ports lib/pages/favourites/components/cart_floating_action_button.dart
export function CartFloatingActionButton({
  cartCount,
  onClick,
}: {
  cartCount: number
  onClick: () => void
}) {
  if (cartCount <= 0) return null

  return (
    <button type="button" className="cart-fab" onClick={onClick}>
      {/* FFIcons.kicons8FastCart96 custom glyph — Dart colors it theme.info
          (white in light); the count text next to it is Colors.white and stays
          hardcoded via the CSS `color: white`. */}
      <FFIcon name="icons8FastCart96" size={24} color="var(--color-info)" />
      <span>{cartCount}</span>
    </button>
  )
}
