/**
 * Pure measure functions.
 *
 * Every function here takes plain arrays and returns plain numbers. No sample
 * objects, no language packs, no I/O — so each one can be golden-tested against
 * a hand-computed value. Language-aware composition happens in analyse.ts.
 */

/** Type-Token Ratio. Sensitive to sample length; report with NDW, never alone. */
export function ttr(words: string[]): number | null {
  if (words.length === 0) return null;
  return new Set(words).size / words.length;
}

/** Number of Different Words. */
export function ndw(words: string[]): number {
  return new Set(words).size;
}

/**
 * NDW over the first N words. Length-equating is the standard fix for TTR's
 * length sensitivity; SALT reports NDW at fixed word counts for this reason.
 * Returns null when the sample is shorter than N, rather than a smaller number
 * that would look like poorer diversity.
 */
export function ndwFirstN(words: string[], n: number): number | null {
  if (words.length < n) return null;
  return new Set(words.slice(0, n)).size;
}

/**
 * Moving-Average Type-Token Ratio (Covington & McFall, 2010).
 * Mean TTR across every window of `window` consecutive tokens.
 */
export function mattr(words: string[], window = 50): number | null {
  if (words.length < window) return null;
  let total = 0;
  let windows = 0;
  for (let i = 0; i + window <= words.length; i++) {
    total += new Set(words.slice(i, i + window)).size / window;
    windows++;
  }
  return windows === 0 ? null : total / windows;
}

/**
 * MTLD — Measure of Textual Lexical Diversity (McCarthy & Jarvis, 2010).
 *
 * Walks the token list accumulating a TTR until it drops to the threshold
 * (0.720), counts that as one complete "factor", resets, and continues. The
 * final incomplete factor is added as a fraction. MTLD is the token count
 * divided by the factor count, averaged over a forward and a reverse pass.
 *
 * Unlike TTR, MTLD does not systematically fall as the sample lengthens, which
 * is why it is the diversity measure ULASA leads with for samples of 50+ words.
 */
export function mtld(words: string[], threshold = 0.72): number | null {
  if (words.length < 10) return null;
  const forward = mtldPass(words, threshold);
  const reverse = mtldPass([...words].reverse(), threshold);
  if (forward === null || reverse === null) return null;
  return (forward + reverse) / 2;
}

function mtldPass(words: string[], threshold: number): number | null {
  let factors = 0;
  let types = new Set<string>();
  let count = 0;
  let currentTtr = 1;

  for (const word of words) {
    count++;
    types.add(word);
    currentTtr = types.size / count;
    if (currentTtr <= threshold) {
      factors++;
      types = new Set();
      count = 0;
      currentTtr = 1;
    }
  }

  // Partial factor for the trailing remainder.
  if (count > 0) {
    const denominator = 1 - threshold;
    factors += denominator === 0 ? 0 : (1 - currentTtr) / denominator;
  }

  // No factor completed: TTR never fell to the threshold anywhere in the text.
  // The sample is too lexically diverse (usually too short) for the factor
  // count to estimate anything, so MTLD is at least the token count. Returning
  // the length is the convention used by the reference implementations, and it
  // keeps the measure monotone instead of dropping out to null.
  if (factors <= 0) return words.length;

  return words.length / factors;
}

/**
 * HD-D (McCarthy & Jarvis, 2007): the hypergeometric distribution version of
 * vocd-D. For each type, the probability that it appears at least once in a
 * random sample of `sampleSize` tokens; summed and scaled.
 *
 * ULASA reports HD-D rather than vocd-D because HD-D is deterministic —
 * vocd-D's curve fitting is stochastic, which makes golden tests and
 * reproducible clinical reporting impossible.
 */
export function hdd(words: string[], sampleSize = 42): number | null {
  const n = words.length;
  if (n < sampleSize) return null;

  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);

  let sum = 0;
  for (const freq of counts.values()) {
    // P(type absent from the draw) = C(n - freq, s) / C(n, s)
    const pAbsent = Math.exp(
      logChoose(n - freq, sampleSize) - logChoose(n, sampleSize),
    );
    const pPresent = 1 - pAbsent;
    sum += pPresent * (1 / sampleSize);
  }
  return sum;
}

function logChoose(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
}

/** Lanczos approximation; accurate well past the sizes a transcript reaches. */
function logGamma(x: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Mean Length of Utterance, in whatever unit the caller counted. */
export function mlu(unitCounts: number[]): number | null {
  if (unitCounts.length === 0) return null;
  const total = unitCounts.reduce((a, b) => a + b, 0);
  return total / unitCounts.length;
}

/** Standard deviation of utterance length — SALT's index of length variability. */
export function sdUtteranceLength(unitCounts: number[]): number | null {
  if (unitCounts.length < 2) return null;
  const m = unitCounts.reduce((a, b) => a + b, 0) / unitCounts.length;
  const variance =
    unitCounts.reduce((acc, v) => acc + (v - m) ** 2, 0) / (unitCounts.length - 1);
  return Math.sqrt(variance);
}

/** Ratio helper that returns null rather than NaN or Infinity on an empty base. */
export function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

/** Percentage helper with the same null-on-empty behaviour. */
export function percent(numerator: number, denominator: number): number | null {
  const r = ratio(numerator, denominator);
  return r === null ? null : r * 100;
}

/** Rounds for display without pretending to precision the sample cannot support. */
export function round(value: number | null, dp = 2): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}
