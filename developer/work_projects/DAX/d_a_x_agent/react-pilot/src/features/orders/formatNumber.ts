// Ports lib/flutter_flow/custom_functions.dart's formatNumberWithSpace.
export function formatNumberWithSpace(value: number): string {
  return value.toLocaleString('ru-RU').replace(/,/g, ' ')
}
