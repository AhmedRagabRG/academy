import "@testing-library/jest-dom/vitest"

/**
 * Web Storage for the jsdom environment.
 *
 * Node 26 ships its own `localStorage`/`sessionStorage` globals, and without
 * `--localstorage-file` they evaluate to `undefined`. They are defined on
 * `globalThis` before the jsdom environment populates it, so jsdom's perfectly
 * working implementation never lands and every `localStorage.x` in a test
 * throws "Cannot read properties of undefined".
 *
 * Running Node with `--localstorage-file` would fix the symptom but persist
 * storage to a real file, leaking state between runs — the opposite of what
 * tests want. So we install an in-memory Storage instead. Vitest runs this
 * setup once per test file, so each file starts from an empty store.
 *
 * Only installed when the global is missing: if a future Node or jsdom hands
 * us a real Storage, it wins.
 */
const createStorage = (): Storage => {
  let entries = new Map<string, string>()
  const storage: Storage = {
    get length() {
      return entries.size
    },
    key: (index) => [...entries.keys()][index] ?? null,
    // Browsers coerce both key and value to strings, and code that stores a
    // number and reads back a string depends on it.
    getItem: (key) => entries.get(String(key)) ?? null,
    setItem: (key, value) => {
      entries.set(String(key), String(value))
    },
    removeItem: (key) => {
      entries.delete(String(key))
    },
    clear: () => {
      entries = new Map()
    },
  }
  return storage
}

for (const name of ["localStorage", "sessionStorage"] as const) {
  // Deliberately inspecting the descriptor rather than reading the value:
  // reading invokes Node's native getter, which prints an ExperimentalWarning
  // on every single test file. Node's inert global is an accessor; anything
  // real — jsdom's, or a future Node that works — is a data property.
  const existing = Object.getOwnPropertyDescriptor(globalThis, name)
  if (existing && "value" in existing && existing.value) continue
  Object.defineProperty(globalThis, name, {
    value: createStorage(),
    configurable: true,
    writable: true,
  })
}
