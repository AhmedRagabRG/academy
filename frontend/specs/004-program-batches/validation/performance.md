# Performance Validation

- Dynamic Next.js 16 pages remain Server Components and await promise-based params.
- Client boundaries begin at interactive screens and controls.
- List services filter, sort, paginate, and return summaries; detail/history are separate queries.
- Query keys are stable and invalidation targets the affected program/detail/history projections.
- Table columns are memoized and superseded reads accept abort signals.
