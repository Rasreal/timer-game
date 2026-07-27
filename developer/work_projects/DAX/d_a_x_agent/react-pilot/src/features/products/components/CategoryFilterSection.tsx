import { useTranslation } from 'react-i18next'
import type { Category } from '../types'
import { FilterChip } from './FilterChip'
import './FilterSection.css'

// Ports lib/pages/products/components/category_filter_section.dart
export function CategoryFilterSection({
  categories,
  selectedCategory,
  onCategorySelected,
}: {
  categories: Category[]
  selectedCategory: string | null
  onCategorySelected: (code: string | null) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="products-filter-section">
      <FilterChip label={t('filter_all')} isSelected={selectedCategory == null} onClick={() => onCategorySelected(null)} />
      {categories.map((category) => (
        <FilterChip
          key={category.codeCategory}
          label={category.nameCategory}
          isSelected={selectedCategory === category.codeCategory}
          onClick={() => onCategorySelected(category.codeCategory)}
        />
      ))}
    </div>
  )
}
