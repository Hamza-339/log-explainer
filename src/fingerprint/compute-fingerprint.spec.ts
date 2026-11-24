import { computeFingerprint } from './compute-fingerprint';

describe('computeFingerprint', () => {
  it('gives distinct error types distinct fingerprints', () => {
    const typeError = computeFingerprint({
      errorType: 'TypeError',
      message: 'Cannot read properties of undefined',
    });
    const rangeError = computeFingerprint({
      errorType: 'RangeError',
      message: 'Cannot read properties of undefined',
    });

    expect(typeError).not.toBe(rangeError);
  });

  it('ignores differing timestamps embedded in the message', () => {
    const first = computeFingerprint({
      errorType: 'TypeError',
      message: 'Request failed at 2026-11-24T10:00:00.000Z',
    });
    const second = computeFingerprint({
      errorType: 'TypeError',
      message: 'Request failed at 2026-11-25T18:32:07.123Z',
    });

    expect(first).toBe(second);
  });

  it('ignores differing UUIDs embedded in the message', () => {
    const first = computeFingerprint({
      errorType: 'NotFoundError',
      message: 'User 123e4567-e89b-12d3-a456-426614174000 not found',
    });
    const second = computeFingerprint({
      errorType: 'NotFoundError',
      message: 'User 9f8e7d6c-5b4a-3c2d-1e0f-abcdef123456 not found',
    });

    expect(first).toBe(second);
  });

  it('ignores differing memory addresses embedded in the message', () => {
    const first = computeFingerprint({
      errorType: 'SegfaultError',
      message: 'Invalid access at 0x7f8b8c000000',
    });
    const second = computeFingerprint({
      errorType: 'SegfaultError',
      message: 'Invalid access at 0x55a1b2c3d4e5',
    });

    expect(first).toBe(second);
  });

  it('ignores differing numbers embedded in the message', () => {
    const first = computeFingerprint({
      errorType: 'RetryError',
      message: 'Failed after 3 retries',
    });
    const second = computeFingerprint({
      errorType: 'RetryError',
      message: 'Failed after 7 retries',
    });

    expect(first).toBe(second);
  });

  it('distinguishes the same error type and message raised from different call sites', () => {
    const first = computeFingerprint({
      errorType: 'TypeError',
      message: 'Cannot read properties of undefined',
      stack: 'TypeError: Cannot read properties of undefined\n    at checkout.js:1:1',
    });
    const second = computeFingerprint({
      errorType: 'TypeError',
      message: 'Cannot read properties of undefined',
      stack: 'TypeError: Cannot read properties of undefined\n    at billing.js:1:1',
    });

    expect(first).not.toBe(second);
  });

  it('ignores differing line/column numbers in the top stack frame', () => {
    const first = computeFingerprint({
      errorType: 'TypeError',
      message: 'Cannot read properties of undefined',
      stack: 'TypeError: Cannot read properties of undefined\n    at main.js:1:1',
    });
    const second = computeFingerprint({
      errorType: 'TypeError',
      message: 'Cannot read properties of undefined',
      stack: 'TypeError: Cannot read properties of undefined\n    at main.js:42:7',
    });

    expect(first).toBe(second);
  });

  it('falls back to error type and normalized message when there is no stack', () => {
    const withoutStack = computeFingerprint({
      errorType: 'TypeError',
      message: 'Cannot read properties of undefined',
    });
    const withEmptyStack = computeFingerprint({
      errorType: 'TypeError',
      message: 'Cannot read properties of undefined',
      stack: '',
    });

    expect(withoutStack).toBe(withEmptyStack);
  });
});
