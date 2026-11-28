import { FingerprintableErrorEvent } from '../src/fingerprint/compute-fingerprint';

export interface EvalFixture {
  id: string;
  /** Ground-truth grouping: fixtures sharing a bugId represent the same underlying bug. */
  bugId: string;
  errorEvent: FingerprintableErrorEvent & { service?: string; environment?: string };
  /** The known root cause, used as ground truth for the explanation-quality judge. */
  labeledRootCause: string;
}
