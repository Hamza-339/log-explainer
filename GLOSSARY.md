# Log Explainer

A push-based service that receives error events from a single small application and uses an LLM to explain each **new** error in plain language. It is a diagnose-and-explain tool, not a log search or aggregation system.

## Language

**Error event**:
A single occurrence of an error that the application reports to the service, carrying the error's type, message, and stack trace.
_Avoid_: log, log line, event, exception

**Fingerprint**:
A normalized, hashed signature of an error event (error type + message template + top stack frame, with variable data like timestamps and IDs stripped out) that collapses many occurrences of the same underlying error into one identity. The first time a fingerprint is seen, its error event is "new".
_Avoid_: hash, signature, dedupe key
