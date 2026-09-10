import type { AiKnowledgeService } from "./ai-knowledge-service"
import type {
  KnowledgeBase,
  KnowledgeBaseId,
  KnowledgeSource,
  KnowledgeSourceId,
} from "../types/domain"

const now = () => new Date().toISOString()
let bases: KnowledgeBase[] = [
  {
    id: "kb-1" as KnowledgeBaseId,
    name: "سياسات الأكاديمية",
    description: "الرسوم، المواعيد، وسياسة الاسترداد",
    status: "active",
    sourceCount: 2,
    version: 1,
    createdAt: now(),
    updatedAt: now(),
  },
]
let sources: KnowledgeSource[] = [
  {
    id: "src-1" as KnowledgeSourceId,
    knowledgeBaseId: "kb-1" as KnowledgeBaseId,
    kind: "file",
    title: "لائحة الرسوم.pdf",
    visibility: "customer-facing",
    status: "ready",
    failureReason: null,
    chunkCount: 12,
    tokenCount: 8400,
    mimeType: "application/pdf",
    sizeBytes: 240_000,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "src-2" as KnowledgeSourceId,
    knowledgeBaseId: "kb-1" as KnowledgeBaseId,
    kind: "text",
    title: "ملاحظات داخلية",
    visibility: "internal",
    status: "failed",
    failureReason: "تعذّر استخراج النص من الملف",
    chunkCount: 0,
    tokenCount: 0,
    mimeType: null,
    sizeBytes: null,
    createdAt: now(),
    updatedAt: now(),
  },
]

let sequence = 2
const nextId = () => `src-${++sequence}` as KnowledgeSourceId

export const mockAiKnowledgeService: AiKnowledgeService = {
  list: () => Promise.resolve([...bases]),
  create: (command) => {
    const base: KnowledgeBase = {
      id: `kb-${bases.length + 1}` as KnowledgeBaseId,
      name: command.name,
      description: command.description ?? null,
      status: "active",
      sourceCount: 0,
      version: 1,
      createdAt: now(),
      updatedAt: now(),
    }
    bases = [...bases, base]
    return Promise.resolve(base)
  },
  update: (command) => {
    const { id, ...rest } = command
    const changes = { ...rest, expectedVersion: undefined }
    delete (changes as { expectedVersion?: number }).expectedVersion
    bases = bases.map((base) =>
      base.id === id
        ? { ...base, ...changes, version: base.version + 1, updatedAt: now() }
        : base,
    )
    return Promise.resolve(bases.find((base) => base.id === id)!)
  },
  remove: ({ id }) => {
    bases = bases.filter((base) => base.id !== id)
    return Promise.resolve()
  },
  sources: (id) =>
    Promise.resolve(sources.filter((source) => source.knowledgeBaseId === id)),
  addFileSource: ({ knowledgeBaseId, file, visibility }) => {
    const source: KnowledgeSource = {
      id: nextId(),
      knowledgeBaseId,
      kind: "file",
      title: file.name,
      visibility,
      status: "pending",
      failureReason: null,
      chunkCount: 0,
      tokenCount: 0,
      mimeType: file.type || null,
      sizeBytes: file.size,
      createdAt: now(),
      updatedAt: now(),
    }
    sources = [...sources, source]
    return Promise.resolve(source)
  },
  addTextSource: ({ knowledgeBaseId, title, visibility }) => {
    const source: KnowledgeSource = {
      id: nextId(),
      knowledgeBaseId,
      kind: "text",
      title,
      visibility,
      status: "pending",
      failureReason: null,
      chunkCount: 0,
      tokenCount: 0,
      mimeType: null,
      sizeBytes: null,
      createdAt: now(),
      updatedAt: now(),
    }
    sources = [...sources, source]
    return Promise.resolve(source)
  },
  removeSource: ({ sourceId }) => {
    sources = sources.filter((source) => source.id !== sourceId)
    return Promise.resolve()
  },
  reindexSource: ({ sourceId }) => {
    sources = sources.map((source) =>
      source.id === sourceId
        ? { ...source, status: "pending" as const, failureReason: null }
        : source,
    )
    return Promise.resolve(sources.find((source) => source.id === sourceId)!)
  },
}
