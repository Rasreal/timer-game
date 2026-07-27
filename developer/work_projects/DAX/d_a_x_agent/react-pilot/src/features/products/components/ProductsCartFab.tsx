import { FFIcon } from '../../../shared/FFIcon'
import './ProductsCartFab.css'

// Ports lib/pages/favourites/components/cart_floating_action_button.dart —
// the widget products_list_widget.dart's `floatingActionButton:` slot
// actually instantiates (NOT products_cart_fab_widget.dart, which is dead
// code / unused by the live products page). CartFloatingActionButton is a
// FloatingActionButton.extended with FFIcons.kicons8FastCart96 (custom glyph,
// not Material shopping_cart), color theme.info (white), and the count text
// in bodyMedium at fontWeight normal (not 500), separated by SizedBox(width:6).
export function ProductsCartFab({ cartCount, onClick }: { cartCount: number; onClick: () => void }) {
  if (cartCount <= 0) return null

  return (
    <button type="button" className="products-cart-fab" onClick={onClick}>
      {/* Icon color is theme.info in cart_floating_action_button.dart; the
          count text is Colors.white (stays hardcoded via CSS). */}
      <FFIcon name="icons8FastCart96" size={24} color="var(--color-info)" />
      <span>{cartCount}</span>
    </button>
  )
}
