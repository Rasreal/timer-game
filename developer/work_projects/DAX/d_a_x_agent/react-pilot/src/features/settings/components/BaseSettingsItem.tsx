import type { ReactNode } from 'react'
import './BaseSettingsItem.css'

// Ports lib/pages/settings/components/base_settings_item.dart
export function BaseSettingsItem({
  title,
  subtitle,
  icon,
  trailing,
  onTap,
  showTopBorder = false,
  showBottomBorder = false,
}: {
  title: string
  subtitle?: string
  icon?: ReactNode
  trailing?: ReactNode
  onTap?: () => void
  showTopBorder?: boolean
  showBottomBorder?: boolean
}) {
  return (
    <div
      className="base-settings-item"
      role={onTap ? 'button' : undefined}
      tabIndex={onTap ? 0 : undefined}
      onClick={onTap}
      style={{
        minHeight: subtitle ? 70 : 55,
        borderTopLeftRadius: showTopBorder ? 12 : 0,
        borderTopRightRadius: showTopBorder ? 12 : 0,
        borderBottomLeftRadius: showBottomBorder ? 12 : 0,
        borderBottomRightRadius: showBottomBorder ? 12 : 0,
      }}
    >
      <div className="base-settings-item__text">
        <span className="base-settings-item__title">{title}</span>
        {subtitle && <span className="base-settings-item__subtitle">{subtitle}</span>}
      </div>
      {trailing ?? (icon && <span className="base-settings-item__icon">{icon}</span>)}
    </div>
  )
}
