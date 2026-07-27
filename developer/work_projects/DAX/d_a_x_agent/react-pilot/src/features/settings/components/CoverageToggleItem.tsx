import { syncCoverageEnabled, useSettingsStore } from '../useSettingsStore'
import { BaseSettingsItem } from './BaseSettingsItem'
import './CoverageToggleItem.css'

// Ports lib/pages/settings/components/coverage_toggle_item.dart
export function CoverageToggleItem() {
  const coverageEnabled = useSettingsStore((s) => s.coverageEnabled)
  const setCoverageEnabled = useSettingsStore((s) => s.setCoverageEnabled)

  const toggle = () => {
    const next = !coverageEnabled
    setCoverageEnabled(next)
    syncCoverageEnabled(next)
  }

  return (
    <BaseSettingsItem
      title="Coverage"
      trailing={
        <button
          type="button"
          className={`coverage-toggle ${coverageEnabled ? 'coverage-toggle--on' : ''}`}
          aria-pressed={coverageEnabled}
          aria-label="Toggle coverage"
          onClick={(e) => {
            e.stopPropagation()
            toggle()
          }}
        >
          <span className="coverage-toggle__thumb" />
        </button>
      }
    />
  )
}
