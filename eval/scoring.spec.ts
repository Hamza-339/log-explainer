import { determineNovelFixtures, scoreFingerprintAccuracy } from './scoring';
import { EvalFixture } from './types';

const fixture = (id: string, bugId: string): EvalFixture => ({
  id,
  bugId,
  errorEvent: { errorType: 'Error', message: 'placeholder' },
  labeledRootCause: 'placeholder',
});

describe('scoreFingerprintAccuracy', () => {
  it('scores perfect precision and recall when fingerprints exactly match bug grouping', () => {
    const fixtures = [fixture('a', 'bug-1'), fixture('b', 'bug-1'), fixture('c', 'bug-2')];
    const fingerprintByBugId: Record<string, string> = { 'bug-1': 'fp-1', 'bug-2': 'fp-2' };
    const computeFingerprintFn = (_event: unknown, index: number) =>
      fingerprintByBugId[fixtures[index].bugId];

    const result = scoreFingerprintAccuracy(fixtures, computeFingerprintFn);

    expect(result.precision).toBe(1);
    expect(result.recall).toBe(1);
    expect(result.falseMerges).toBe(0);
    expect(result.missedDedups).toBe(0);
  });

  it('counts a false merge when two distinct bugs collapse to the same fingerprint', () => {
    const fixtures = [fixture('a', 'bug-1'), fixture('b', 'bug-2')];
    const computeFingerprintFn = () => 'same-fp';

    const result = scoreFingerprintAccuracy(fixtures, computeFingerprintFn);

    expect(result.falseMerges).toBe(1);
    expect(result.precision).toBe(0);
  });

  it('counts a missed dedup when two occurrences of the same bug get different fingerprints', () => {
    const fixtures = [fixture('a', 'bug-1'), fixture('b', 'bug-1')];
    let callCount = 0;
    const computeFingerprintFn = () => `fp-${callCount++}`;

    const result = scoreFingerprintAccuracy(fixtures, computeFingerprintFn);

    expect(result.missedDedups).toBe(1);
    expect(result.recall).toBe(0);
  });
});

describe('determineNovelFixtures', () => {
  it('treats the first occurrence of each fingerprint as novel and later repeats as not novel', () => {
    const fingerprintsByFixtureId = new Map([
      ['a', 'fp-1'],
      ['b', 'fp-1'],
      ['c', 'fp-2'],
    ]);
    const fixtures = [fixture('a', 'bug-1'), fixture('b', 'bug-1'), fixture('c', 'bug-2')];

    const novel = determineNovelFixtures(fixtures, fingerprintsByFixtureId);

    expect(novel.map((f) => f.id)).toEqual(['a', 'c']);
  });
});
