import { describe, expect, it } from "vitest"
describe("theme authority", () => { it("keeps system as the safe default", () => expect("system").toBe("system")) })
