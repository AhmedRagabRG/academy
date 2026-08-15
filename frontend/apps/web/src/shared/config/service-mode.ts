/**
 * Whether a feature talks to the API or to its in-memory fixtures.
 *
 * Modules that the backend already serves default to the real API. The mock
 * implementations are kept — and stay reachable by setting
 * `NEXT_PUBLIC_API_MOCKS=true` — because the Playwright journeys drive
 * deterministic states (empty, conflict, permission-denied) through the mock
 * scenario controllers, which no live database can be asked to reproduce
 * on demand.
 *
 */
export const useMockServices = process.env.NEXT_PUBLIC_API_MOCKS === "true"
