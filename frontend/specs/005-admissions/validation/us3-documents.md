# US3 Document Evidence

- Requirements come from a versioned policy snapshot and accept only configured PDF/JPEG/PNG files.
- Uploads are idempotent; replacement appends a new undecided version; verification targets an exact version.
- Manage and verify permissions are evaluated independently. Approval readiness counts verified required slots.
- Mock limitation: file bytes remain browser object URLs; only metadata and immutable history are persisted in memory.
