import { createHash } from 'crypto';

export interface FingerprintableErrorEvent {
  errorType: string;
  message: string;
  stack?: string;
}

const ISO8601_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?/g;
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const MEMORY_ADDRESS_PATTERN = /0x[0-9a-f]+/gi;
const NUMBER_PATTERN = /\d+/g;

function normalize(text: string): string {
  return text
    .replace(ISO8601_PATTERN, '<TS>')
    .replace(UUID_PATTERN, '<UUID>')
    .replace(MEMORY_ADDRESS_PATTERN, '<ADDR>')
    .replace(NUMBER_PATTERN, '<NUM>');
}

function extractTopStackFrame(stack: string | undefined): string {
  if (!stack) {
    return '';
  }
  const frameLine = stack.split('\n').find((line) => line.trim().startsWith('at '));
  return frameLine ? frameLine.trim() : '';
}

export function computeFingerprint(errorEvent: FingerprintableErrorEvent): string {
  const topFrame = normalize(extractTopStackFrame(errorEvent.stack));
  const raw = `${errorEvent.errorType}|${normalize(errorEvent.message)}|${topFrame}`;
  return createHash('sha256').update(raw).digest('hex');
}
