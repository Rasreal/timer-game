import type { PriceType } from '../types'
import { FilterChip } from './FilterChip'
import './FilterSection.css'

// Ports lib/pages/products/components/price_type_filter_section.dart
export function PriceTypeFilterSection({
  priceTypes,
  selectedPriceType,
  selectedCategory,
  onPriceTypeSelected,
}: {
  priceTypes: PriceType[]
  selectedPriceType: string | null
  selectedCategory: string | null
  onPriceTypeSelected: (priceType: PriceType) => void
}) {
  const filteredPriceTypes = selectedCategory
    ? priceTypes.filter((pt) => pt.categories.some((c) => c.codeCategory === selectedCategory))
    : priceTypes

  if (filteredPriceTypes.length === 0) return null

  return (
    <div className="products-filter-section">
      {filteredPriceTypes.map((priceType) => (
        <FilterChip
          key={priceType.codePriceType}
          label={priceType.namePriceType}
          isSelected={selectedPriceType === priceType.codePriceType}
          onClick={() => onPriceTypeSelected(priceType)}
        />
      ))}
    </div>
  )
}
