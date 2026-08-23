/**
 * Edge-case and invariant checks for the TEI engine.
 *
 * The reference cases in tei.verify.ts prove the formulas match the client's
 * workbook. This file covers what a single worked example cannot: dataset
 * boundaries, interpolation, clamping, and the directional properties the
 * scores must obey to be trustworthy.
 *
 * Run with:  npm run verify:edge
 */
import {
  CARDIO_DATASET,
  CIRCUITS_DATASET,
  EXERCISES_DATASET,
  LIMITS,
  REST_DATASET,
  YOGA_DATASET,
  calculateTei,
  calculateBreakdownTei,
  calculateCardioTei,
  calculateCircuitTei,
  calculateYogaTei,
  plot,
  gradeAgainstPlan,
} from './tei';


let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

const std = (s: number, r: number, e: number, c: number) =>
  calculateTei({
    sets: s, restSeconds: r, exertionPercent: e, cardioMinutes: c,
  }).tei;

console.log('\n— dataset nodes return their exact table value —');
for (const [name, ds] of [
  ['rest', REST_DATASET], ['cardio', CARDIO_DATASET],
  ['exercises', EXERCISES_DATASET], ['circuits', CIRCUITS_DATASET],
  ['yoga', YOGA_DATASET],
] as const) {
  const bad = ds.filter(([x, y]) => Math.abs(plot(x, ds) - y) > 1e-9);
  check(`${name}: all ${ds.length} nodes exact`, bad.length === 0,
    bad.length ? `${bad.length} wrong` : '');
}

console.log('\n— interpolation between nodes —');
check('rest 45 = 1.375 (midpoint of 1.75 and 1.00)',
  Math.abs(plot(45, REST_DATASET) - 1.375) < 1e-9);
check('cardio 51 = 1.05 (midpoint of 0.85 and 1.25)',
  Math.abs(plot(51, CARDIO_DATASET) - 1.05) < 1e-9);
check('yoga 56 = 1.055 (midpoint of 1.00 and 1.11)',
  Math.abs(plot(56, YOGA_DATASET) - 1.055) < 1e-9);

console.log('\n— clamping outside the dataset range —');
check('rest below first node clamps up', plot(1, REST_DATASET) === 1.75);
check('rest 0 contributes nothing', plot(0, REST_DATASET) === 0);
check('rest above last node clamps down', plot(9999, REST_DATASET) === 0.22);
// Client rule: 0 means "did no cardio" and must contribute nothing. Only
// values BETWEEN 0 and the first dataset row clamp up.
check('cardio 0 contributes nothing', plot(0, CARDIO_DATASET) === 0);
check('cardio between 0 and first node clamps up',
  plot(2, CARDIO_DATASET) === 0.11);
check('yoga 0 contributes nothing', plot(0, YOGA_DATASET) === 0);
check('cardio above last node clamps down', plot(9999, CARDIO_DATASET) === 0.02);

console.log('\n— non-finite input is not propagated as NaN —');
check('plot(NaN) = 0', plot(Number.NaN, REST_DATASET) === 0);
check('standard with NaN sets is finite',
  Number.isFinite(std(Number.NaN, 60, 80, 41)));

console.log('\n— monotonicity: scores move the right direction —');
let mono = true;
for (let s = 1; s < 44; s++) if (std(s, 60, 80, 41) > std(s + 1, 60, 80, 41)) mono = false;
check('more sets never lowers TEI', mono);

mono = true;
for (let r = 30; r < 240; r += 5) if (std(20, r, 80, 41) < std(20, r + 5, 80, 41)) mono = false;
check('more rest never raises TEI', mono);

mono = true;
for (let e = 50; e < 100; e++) if (std(20, 60, e, 41) > std(20, 60, e + 1, 41)) mono = false;
check('more exertion never lowers TEI', mono);

console.log('\n— every calculator returns a finite, non-negative score —');
const all: [string, number][] = [
  ['standard', std(20, 60, 80, 40)],
  ['breakdown', calculateBreakdownTei({ sets: 4, breakdowns: 3, restSeconds: 60, exertionPercent: 80, cardioMinutes: 30 }).tei],
  ['circuit', calculateCircuitTei({ exercises: 5, circuits: 5, exertionPercent: 80, cardioMinutes: 20 }).tei],
  ['cardio', calculateCardioTei({ cardioMinutes: 45 }).tei],
  ['yoga', calculateYogaTei({ yogaMinutes: 60, exertionPercent: 80, cardioMinutes: 15 }).tei],
];
for (const [name, v] of all) {
  check(`${name} finite and >= 0`, Number.isFinite(v) && v >= 0, v.toFixed(2));
}

console.log('\n— scores across each calculator\'s full input range —');
for (const [name, v] of all) {
  const inBand = v >= LIMITS.tei.min && v <= LIMITS.tei.max;
  console.log(
    `      ${name.padEnd(10)} ${v.toFixed(2).padStart(6)}` +
      `  ${inBand ? 'inside' : 'OUTSIDE'} the specced ${LIMITS.tei.min}-${LIMITS.tei.max} TEI band`,
  );
}

console.log('\n— limits match the workbook README table —');
check('sets 1..44, red above 33',
  LIMITS.sets.min === 1 && LIMITS.sets.max === 44 && LIMITS.sets.overAt === 33);
check('cardio 7..150, red above 65',
  LIMITS.cardio.min === 7 && LIMITS.cardio.max === 150 && LIMITS.cardio.overAt === 65);
check('exertion 50..100',
  LIMITS.exertion.min === 50 && LIMITS.exertion.max === 100);
check('breakdowns 1..5, red above 3',
  LIMITS.breakdowns.min === 1 && LIMITS.breakdowns.max === 5 && LIMITS.breakdowns.overAt === 3);
check('yoga 4..100, red above 65',
  LIMITS.yogaMinutes.min === 4 && LIMITS.yogaMinutes.max === 100 && LIMITS.yogaMinutes.overAt === 65);

console.log('\n— zero cardio means zero (client rule) —');
check('all-zero session scores 0',
  std(0, 0, 0, 0) === 0, std(0, 0, 0, 0).toFixed(2));
check('strength-only carries no phantom cardio',
  Math.abs(std(20, 60, 80, 0) - 9.6) < 1e-9, std(20, 60, 80, 0).toFixed(2));
check('workbook reference is unaffected',
  Math.abs(std(11, 60, 80, 41) - 13.78) < 1e-9, std(11, 60, 80, 41).toFixed(2));

console.log('\n— plan grading thresholds (workbook colour-coding table) —');
check('no plan -> none', gradeAgainstPlan(14, null) === 'none');
check('zero plan -> none', gradeAgainstPlan(14, 0) === 'none');
check('under 70% -> under', gradeAgainstPlan(6, 10) === 'under');
check('70% -> close', gradeAgainstPlan(7, 10) === 'close');
check('89% -> close', gradeAgainstPlan(8.9, 10) === 'close');
check('90% -> on', gradeAgainstPlan(9, 10) === 'on');
check('110% -> on', gradeAgainstPlan(11, 10) === 'on');
check('over 110% -> over', gradeAgainstPlan(11.1, 10) === 'over');

console.log(failed === 0 ? '\nAll edge cases pass.' : `\n${failed} check(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);
