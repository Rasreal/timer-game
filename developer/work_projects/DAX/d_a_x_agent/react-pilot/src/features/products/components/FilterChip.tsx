import './FilterChip.css'

// Ports lib/pages/products/components/filter_chip_widget.dart
export function FilterChip({
  label,
  isSelected,
  onClick,
}: {
  label: string
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`products-filter-chip${isSelected ? ' products-filter-chip--selected' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
