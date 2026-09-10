import { httpClient } from "@/shared/api/http-client"
import type { AiKnowledgeService } from "./ai-knowledge-service"
import {
  toKnowledgeBase,
  toKnowledgeSource,
  type ApiKnowledgeBase,
  type ApiKnowledgeSource,
} from "./ai-knowledge-mapper"
import type { KnowledgeBaseId } from "../types/domain"

const root = "/ai/knowledge-bases"

export const httpAiKnowledgeService: AiKnowledgeService = {
  async list(signal) {
    const rows = await httpClient.get<ApiKnowledgeBase[]>(root, undefined, signal)
    return rows.map(toKnowledgeBase)
  },
  async create(command) {
    return toKnowledgeBase(await httpClient.post<ApiKnowledgeBase>(root, command))
  },
  async update({ id, ...body }) {
    return toKnowledgeBase(
      await httpClient.patch<ApiKnowledgeBase>(`${root}/${id}`, body),
    )
  },
  async remove({ id, expectedVersion }) {
    // The versioned delete carries its guard in the body; httpClient.delete
    // forwards one, so no query-string workaround is needed.
    await httpClient.delete<void>(`${root}/${id}`, { expectedVersion })
  },
  async sources(id: KnowledgeBaseId, signal) {
    const rows = await httpClient.get<ApiKnowledgeSource[]>(
      `${root}/${id}/sources`,
      undefined,
      signal,
    )
    return rows.map(toKnowledgeSource)
  },
  async addFileSource({ knowledgeBaseId, file, visibility }) {
    const form = new FormData()
    form.append("file", file)
    form.append("kind", "file")
    form.append("visibility", visibility)
    return toKnowledgeSource(
      await httpClient.postForm<ApiKnowledgeSource>(
        `${root}/${knowledgeBaseId}/sources`,
        form,
      ),
    )
  },
  async addTextSource({ knowledgeBaseId, title, rawText, visibility }) {
    return toKnowledgeSource(
      await httpClient.post<ApiKnowledgeSource>(
        `${root}/${knowledgeBaseId}/sources`,
        { kind: "text", title, rawText, visibility },
      ),
    )
  },
  async removeSource({ sourceId }) {
    await httpClient.delete<void>(`${root}/sources/${sourceId}`)
  },
  async reindexSource({ sourceId }) {
    return toKnowledgeSource(
      await httpClient.post<ApiKnowledgeSource>(
        `${root}/sources/${sourceId}/reindex`,
      ),
    )
  },
}
