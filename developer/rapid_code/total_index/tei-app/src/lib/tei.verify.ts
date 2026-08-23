/**
 * Reference cases for all five TEI calculators.
 *
 * Every expected value below is the number the CLIENT'S OWN WORKBOOK
 * computes for that sheet's worked example
 * ("Total Effect Index TEI - 5 Calculators.xlsx", cached formula results).
 * If one of these fails, the implementation has drifted from the source of
 * truth — fix the code, not the expectation.
 *
 * Run with:  npx tsx src/lib/tei.verify.ts
 */
import {
  calculateTei,
  calculateBreakdownTei,
  calculateCircuitTei,
  calculateCardioTei,
  calculateYogaTei,
  displayTei,
} from './tei';

interface Case {
  name: string;
  sheet: string;
  cell: string;
  got: number;
  want: number;
}

const cases: Case[] = [
  {
    name: 'Standard: 11 sets / 60s / 80% / 41min',
    sheet: 'Standard Strength Training',
    cell: 'B95',
    got: calculateTei({
      sets: 11, restSeconds: 60, exertionPercent: 80, cardioMinutes: 41,
    }).tei,
    want: 13.78,
  },
  {
    name: 'Breakdown: 4 sets / 4 breakdowns / 60s / 70% / 36min',
    sheet: 'Breakdown Strength Training',
    cell: 'B106',
    got: calculateBreakdownTei({
      sets: 4, breakdowns: 4, restSeconds: 60,
      exertionPercent: 70, cardioMinutes: 36,
    }).tei,
    want: 14.095,
  },
  {
    name: 'Circuit: 5 exercises / 7 circuits / 55% / 14min',
    sheet: 'Circuit Strength Training',
    cell: 'B116',
    got: calculateCircuitTei({
      exercises: 5, circuits: 7, exertionPercent: 55, cardioMinutes: 14,
    }).tei,
    want: 14.15,
  },
  {
    name: 'Cardio ONLY: 41min',
    sheet: 'Cardio ONLY Training',
    cell: 'B41',
    got: calculateCardioTei({ cardioMinutes: 41 }).tei,
    want: 8.5,
  },
  {
    name: 'Yoga: 59min / 100% / 17min cardio',
    sheet: 'Yoga Training',
    cell: 'B84',
    got: calculateYogaTei({
      yogaMinutes: 59, exertionPercent: 100, cardioMinutes: 17,
    }).tei,
    want: 14.3,
  },
];

let failed = 0;
console.log('TEI calculators vs the client workbook\n');
for (const c of cases) {
  const ok = Math.abs(c.got - c.want) < 0.005;
  if (!ok) failed++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${c.name}\n` +
      `      ${c.sheet} ${c.cell}: got ${c.got.toFixed(3)}, want ${c.want}` +
      `  (displays as ${displayTei(c.got)})`,
  );
}
console.log(
  failed === 0
    ? '\nAll 5 calculators match the workbook.'
    : `\n${failed} calculator(s) DRIFTED from the workbook.`,
);
process.exit(failed === 0 ? 0 : 1);
