import { useWindowDimensions } from 'react-native';

/**
 * Size of a calculator's variable rings. Ken's 11 Nov 2026 edits ("Calculator
 * Rings"): with the no-scroll requirement abandoned, the rings go back to a
 * larger size — in his mockup two rings fill the row, each about 40% of the
 * screen width. Kept between the old 132pt and 172pt so a big phone does not
 * blow them up further.
 */
export function calcRingSize(windowWidth: number): number {
  const fromWidth = (windowWidth - 40) * 0.45;
  return Math.round(Math.min(172, Math.max(132, fromWidth)));
}

export function useCalcRingSize(): number {
  const { width } = useWindowDimensions();
  return calcRingSize(width);
}
