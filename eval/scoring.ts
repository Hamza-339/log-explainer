import { computeFingerprint, FingerprintableErrorEvent } from '../src/fingerprint/compute-fingerprint';
import { EvalFixture } from './types';

export type ComputeFingerprintFn = (errorEvent: FingerprintableErrorEvent, index: number) => string;

export interface FingerprintScoringResult {
  precision: number;
  recall: number;
  /** Distinct bugs incorrectly merged into one fingerprint. */
  falseMerges: number;
  /** Repeats of the same bug incorrectly treated as novel (different fingerprints). */
  missedDedups: number;
  fingerprintsByFixtureId: Map<string, string>;
}

/**
 * Scores fingerprint accuracy over all fixture pairs: a pair is a true positive when
 * fixtures share a bugId and a fingerprint, a false merge when distinct bugs share a
 * fingerprint, and a missed dedup when the same bug produces different fingerprints.
 */
export function scoreFingerprintAccuracy(
  fixtures: EvalFixture[],
  computeFingerprintFn: ComputeFingerprintFn = computeFingerprint,
): FingerprintScoringResult {
  const fingerprintsByFixtureId = new Map<string, string>();
  const fingerprints = fixtures.map((fixture, index) => {
    const fingerprint = computeFingerprintFn(fixture.errorEvent, index);
    fingerprintsByFixtureId.set(fixture.id, fingerprint);
    return fingerprint;
  });

  let truePositives = 0;
  let falseMerges = 0;
  let missedDedups = 0;

  for (let i = 0; i < fixtures.length; i++) {
    for (let j = i + 1; j < fixtures.length; j++) {
      const sameBug = fixtures[i].bugId === fixtures[j].bugId;
      const sameFingerprint = fingerprints[i] === fingerprints[j];

      if (sameBug && sameFingerprint) {
        truePositives++;
      } else if (sameBug && !sameFingerprint) {
        missedDedups++;
      } else if (!sameBug && sameFingerprint) {
        falseMerges++;
      }
    }
  }

  const precision = truePositives + falseMerges === 0 ? 1 : truePositives / (truePositives + falseMerges);
  const recall = truePositives + missedDedups === 0 ? 1 : truePositives / (truePositives + missedDedups);

  return { precision, recall, falseMerges, missedDedups, fingerprintsByFixtureId };
}

/**
 * Mirrors the production novelty gate (first INSERT for a fingerprint wins): walking
 * fixtures in order, a fixture is novel the first time its fingerprint is seen.
 */
export function determineNovelFixtures(
  fixtures: EvalFixture[],
  fingerprintsByFixtureId: Map<string, string>,
): EvalFixture[] {
  const seenFingerprints = new Set<string>();
  return fixtures.filter((fixture) => {
    const fingerprint = fingerprintsByFixtureId.get(fixture.id);
    if (fingerprint === undefined || seenFingerprints.has(fingerprint)) {
      return false;
    }
    seenFingerprints.add(fingerprint);
    return true;
  });
}
