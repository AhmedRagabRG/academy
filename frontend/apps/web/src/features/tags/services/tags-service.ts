import { httpClient } from "@/shared/api/http-client"
import { useMockServices } from "@/shared/config/service-mode"
import type {
  CreateTagCommand,
  InboxTagId,
  ManagedTag,
  UpdateTagCommand,
} from "../types/domain"

export interface TagsService {
  list(signal?: AbortSignal): Promise<ManagedTag[]>
  create(command: CreateTagCommand): Promise<ManagedTag>
  update(command: UpdateTagCommand): Promise<ManagedTag>
  remove(id: InboxTagId): Promise<void>
}

const httpService: TagsService = {
  list: (signal) => httpClient.get<ManagedTag[]>("/tags", undefined, signal),
  create: (command) => httpClient.post<ManagedTag>("/tags", command),
  update: ({ id, ...body }) => httpClient.patch<ManagedTag>(`/tags/${id}`, body),
  remove: async (id) => {
    await httpClient.delete<void>(`/tags/${id}`)
  },
}

let mockTags: ManagedTag[] = [
  { id: "tag-lead" as InboxTagId, label: "عميل محتمل", color: "blue", active: true, usageCount: 3 },
  { id: "tag-vip" as InboxTagId, label: "VIP", color: "violet", active: true, usageCount: 0 },
]
const mockService: TagsService = {
  list: () => Promise.resolve([...mockTags]),
  create: ({ label, color }) => {
    const tag: ManagedTag = {
      id: `tag-${mockTags.length + 1}` as InboxTagId,
      label,
      color,
      active: true,
      usageCount: 0,
    }
    mockTags = [...mockTags, tag]
    return Promise.resolve(tag)
  },
  update: ({ id, ...changes }) => {
    mockTags = mockTags.map((tag) => (tag.id === id ? { ...tag, ...changes } : tag))
    return Promise.resolve(mockTags.find((tag) => tag.id === id)!)
  },
  remove: (id) => {
    mockTags = mockTags.filter((tag) => tag.id !== id)
    return Promise.resolve()
  },
}

export const tagsService: TagsService = useMockServices ? mockService : httpService
