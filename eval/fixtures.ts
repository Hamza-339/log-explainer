import { EvalFixture } from './types';

/**
 * Labeled error events for scoring fingerprint accuracy and explanation quality.
 * `bugId` is the ground truth: fixtures sharing a bugId are the same underlying bug
 * and should collapse to one fingerprint; different bugIds should stay separate.
 */
export const fixtures: EvalFixture[] = [
  // Same bug, repeated with varying timestamp/UUID/line number in the stack frame.
  {
    id: 'null-profile-1',
    bugId: 'null-pointer-user-profile',
    errorEvent: {
      errorType: 'TypeError',
      message: "Cannot read properties of undefined (reading 'email')",
      stack: [
        "TypeError: Cannot read properties of undefined (reading 'email')",
        '    at renderProfile (/app/src/profile.js:42:17)',
        '    at handleRequest (/app/src/server.js:88:5)',
      ].join('\n'),
      service: 'web',
      environment: 'prod',
    },
    labeledRootCause: 'The profile renderer dereferences user.email before checking that the user record was loaded, so a missing/null user crashes the request.',
  },
  {
    id: 'null-profile-2',
    bugId: 'null-pointer-user-profile',
    errorEvent: {
      errorType: 'TypeError',
      message: "Cannot read properties of undefined (reading 'email')",
      stack: [
        "TypeError: Cannot read properties of undefined (reading 'email')",
        '    at renderProfile (/app/src/profile.js:57:9)',
        '    at handleRequest (/app/src/server.js:88:5)',
      ].join('\n'),
      service: 'web',
      environment: 'prod',
    },
    labeledRootCause: 'The profile renderer dereferences user.email before checking that the user record was loaded, so a missing/null user crashes the request.',
  },
  {
    id: 'null-profile-3',
    bugId: 'null-pointer-user-profile',
    errorEvent: {
      errorType: 'TypeError',
      message: "Cannot read properties of undefined (reading 'email')",
      stack: [
        "TypeError: Cannot read properties of undefined (reading 'email')",
        '    at renderProfile (/app/src/profile.js:42:17)',
        '    at Object.<anonymous> (/app/src/worker.js:0x7fa3c2d4:3)',
      ].join('\n'),
      service: 'web',
      environment: 'prod',
    },
    labeledRootCause: 'The profile renderer dereferences user.email before checking that the user record was loaded, so a missing/null user crashes the request.',
  },

  // Superficially similar TypeError, genuinely distinct bug (different property/root cause).
  {
    id: 'null-order-total-1',
    bugId: 'null-pointer-order-total',
    errorEvent: {
      errorType: 'TypeError',
      message: "Cannot read properties of undefined (reading 'total')",
      stack: [
        "TypeError: Cannot read properties of undefined (reading 'total')",
        '    at calculateInvoice (/app/src/billing.js:103:21)',
        '    at handleRequest (/app/src/server.js:88:5)',
      ].join('\n'),
      service: 'web',
      environment: 'prod',
    },
    labeledRootCause: 'The invoice calculator reads cart.total before the cart has finished loading from the pricing service, so a slow pricing response crashes the request.',
  },
  {
    id: 'null-order-total-2',
    bugId: 'null-pointer-order-total',
    errorEvent: {
      errorType: 'TypeError',
      message: "Cannot read properties of undefined (reading 'total')",
      stack: [
        "TypeError: Cannot read properties of undefined (reading 'total')",
        '    at calculateInvoice (/app/src/billing.js:110:4)',
        '    at handleRequest (/app/src/server.js:88:5)',
      ].join('\n'),
      service: 'web',
      environment: 'prod',
    },
    labeledRootCause: 'The invoice calculator reads cart.total before the cart has finished loading from the pricing service, so a slow pricing response crashes the request.',
  },

  // Same bug, same fingerprint expected across staging and prod.
  {
    id: 'db-timeout-staging',
    bugId: 'db-connection-timeout',
    errorEvent: {
      errorType: 'ConnectionTimeoutError',
      message: 'Connection to database timed out after 5000ms',
      stack: [
        'ConnectionTimeoutError: Connection to database timed out after 5000ms',
        '    at Pool.connect (/app/src/database/pg-pool.js:30:11)',
      ].join('\n'),
      service: 'api',
      environment: 'staging',
    },
    labeledRootCause: 'The connection pool is undersized for peak traffic, so requests queue past the 5s connect timeout under load.',
  },
  {
    id: 'db-timeout-prod',
    bugId: 'db-connection-timeout',
    errorEvent: {
      errorType: 'ConnectionTimeoutError',
      message: 'Connection to database timed out after 5000ms',
      stack: [
        'ConnectionTimeoutError: Connection to database timed out after 5000ms',
        '    at Pool.connect (/app/src/database/pg-pool.js:30:11)',
      ].join('\n'),
      service: 'api',
      environment: 'prod',
    },
    labeledRootCause: 'The connection pool is undersized for peak traffic, so requests queue past the 5s connect timeout under load.',
  },

  // Same bug, no stack trace, repeated.
  {
    id: 'missing-config-api-key-1',
    bugId: 'missing-config-api-key',
    errorEvent: {
      errorType: 'ConfigError',
      message: 'Missing required config key: API_KEY',
      service: 'worker',
      environment: 'prod',
    },
    labeledRootCause: 'The worker deployment is missing the API_KEY environment variable, so startup validation fails before the process can serve traffic.',
  },
  {
    id: 'missing-config-api-key-2',
    bugId: 'missing-config-api-key',
    errorEvent: {
      errorType: 'ConfigError',
      message: 'Missing required config key: API_KEY',
      service: 'worker',
      environment: 'prod',
    },
    labeledRootCause: 'The worker deployment is missing the API_KEY environment variable, so startup validation fails before the process can serve traffic.',
  },

  // Distinct bug, also stackless, superficially similar message shape.
  {
    id: 'missing-config-db-host',
    bugId: 'missing-config-db-host',
    errorEvent: {
      errorType: 'ConfigError',
      message: 'Missing required config key: DB_HOST',
      service: 'worker',
      environment: 'prod',
    },
    labeledRootCause: 'The worker deployment is missing the DB_HOST environment variable, so it cannot construct a database connection string at startup.',
  },

  // Same bug, varying memory address and line number.
  {
    id: 'rate-limit-1',
    bugId: 'rate-limit-exceeded-partner-api',
    errorEvent: {
      errorType: 'RateLimitError',
      message: 'Partner API rejected request: rate limit exceeded',
      stack: [
        'RateLimitError: Partner API rejected request: rate limit exceeded',
        '    at PartnerApiClient.request (0x7fa3c2d4e210)',
        '    at syncInventory (/app/src/inventory.js:64:12)',
      ].join('\n'),
      service: 'inventory-sync',
      environment: 'prod',
    },
    labeledRootCause: 'The inventory sync job has no backoff between retries, so it bursts past the partner API rate limit whenever a sync is delayed and catches up.',
  },
  {
    id: 'rate-limit-2',
    bugId: 'rate-limit-exceeded-partner-api',
    errorEvent: {
      errorType: 'RateLimitError',
      message: 'Partner API rejected request: rate limit exceeded',
      stack: [
        'RateLimitError: Partner API rejected request: rate limit exceeded',
        '    at PartnerApiClient.request (0x7fb1a9c0f330)',
        '    at syncInventory (/app/src/inventory.js:71:3)',
      ].join('\n'),
      service: 'inventory-sync',
      environment: 'prod',
    },
    labeledRootCause: 'The inventory sync job has no backoff between retries, so it bursts past the partner API rate limit whenever a sync is delayed and catches up.',
  },

  // Same bug, varying embedded timestamp and UUID (event id) within the message.
  {
    id: 'webhook-signature-1',
    bugId: 'webhook-signature-verification-failure',
    errorEvent: {
      errorType: 'WebhookDeliveryError',
      message:
        'Webhook delivery failed for event 3fa85f64-5717-4562-b3fc-2c963f66afa6 at 2026-01-15T10:22:31.482Z: signature verification failed',
      stack: [
        'WebhookDeliveryError: signature verification failed',
        '    at verifySignature (/app/src/webhooks/deliver.js:28:9)',
      ].join('\n'),
      service: 'webhooks',
      environment: 'prod',
    },
    labeledRootCause: 'The webhook signing secret was rotated but the receiving endpoint config still has the old secret, so every delivery fails signature verification.',
  },
  {
    id: 'webhook-signature-2',
    bugId: 'webhook-signature-verification-failure',
    errorEvent: {
      errorType: 'WebhookDeliveryError',
      message:
        'Webhook delivery failed for event 9c8e1a2b-44f0-4d3e-9a7f-1b2c3d4e5f60 at 2026-01-15T11:47:03.019Z: signature verification failed',
      stack: [
        'WebhookDeliveryError: signature verification failed',
        '    at verifySignature (/app/src/webhooks/deliver.js:28:9)',
      ].join('\n'),
      service: 'webhooks',
      environment: 'prod',
    },
    labeledRootCause: 'The webhook signing secret was rotated but the receiving endpoint config still has the old secret, so every delivery fails signature verification.',
  },
];
