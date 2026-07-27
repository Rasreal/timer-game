// Matches Dart's dateTimeFormat("d/M/y", date) used as the created_at_dmy filter key.
export function formatDMY(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
}

// Matches Dart's dateTimeFormat("dd-MM-yyyy", date) used in the orders app-bar subtitle.
export function formatDDMMYYYY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}-${mm}-${date.getFullYear()}`
}

export function formatDDMMYYYYDots(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${date.getFullYear()}`
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

// Matches Dart's dateTimeFormat("jms", date) — locale time with seconds
// (e.g. "16:32:36"), used in the order details sheet and shop order card.
export function formatHMS(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return formatDMY(a) === formatDMY(b)
}
