import { describe, expect, it } from "vitest"
import { isIndexing } from "@/features/ai-knowledge/types/domain"
import {
  toKnowledgeBase,
  toKnowledgeSource,
} from "@/features/ai-knowledge/services/ai-knowledge-mapper"
import { mockAiKnowledgeService } from "@/features/ai-knowledge/services/mock-ai-knowledge-service"
import type { KnowledgeBaseId } from "@/features/ai-knowledge/types/domain"

const source = (status: string) =>
  toKnowledgeSource({
    id: "s1",
    knowledgeBaseId: "kb-1",
    kind: "file",
    title: "t",
    visibility: "customer-facing",
    status,
    failureReason: null,
    chunkCount: 0,
    tokenCount: 0,
    mimeType: null,
    sizeBytes: null,
    createdAt: "",
    updatedAt: "",
  })

describe("knowledge base mapping", () => {
  it("defaults a missing sourceCount to zero rather than undefined", () => {
    const base = toKnowledgeBase({
      id: "kb-1",
      name: "س",
      description: null,
      status: "active",
      version: 1,
      createdAt: "",
      updatedAt: "",
    })
    expect(base.sourceCount).toBe(0)
  })

  it("carries the failure reason through so the UI can show why indexing failed", () => {
    const failed = toKnowledgeSource({
      id: "s1",
      knowledgeBaseId: "kb-1",
      kind: "file",
      title: "t",
      visibility: "internal",
      status: "failed",
      failureReason: "تعذّر استخراج النص",
      chunkCount: 0,
      tokenCount: 0,
      mimeType: null,
      sizeBytes: null,
      createdAt: "",
      updatedAt: "",
    })
    expect(failed.failureReason).toBe("تعذّر استخراج النص")
    expect(failed.visibility).toBe("internal")
  })
})

describe("indexing detection drives polling", () => {
  it("is true while anything is pending or processing", () => {
    expect(isIndexing([source("ready"), source("pending")])).toBe(true)
    expect(isIndexing([source("processing")])).toBe(true)
  })
  it("is false once everything has settled, so a settled page stops polling", () => {
    expect(isIndexing([source("ready"), source("failed")])).toBe(false)
    expect(isIndexing([])).toBe(false)
  })
})

describe("mock service", () => {
  it("adds a text source in the pending state so the UI shows it indexing", async () => {
    const created = await mockAiKnowledgeService.addTextSource({
      knowledgeBaseId: "kb-1" as KnowledgeBaseId,
      title: "سياسة الاسترداد",
      rawText: "نص",
      visibility: "customer-facing",
    })
    expect(created.status).toBe("pending")
    const all = await mockAiKnowledgeService.sources("kb-1" as KnowledgeBaseId)
    expect(all.map((s) => s.id)).toContain(created.id)
  })
})
