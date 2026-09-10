import type { KnowledgeBase, KnowledgeBaseId, KnowledgeSource } from "../types/domain"
import type {
  CreateFileSourceCommand,
  CreateKnowledgeBaseCommand,
  CreateTextSourceCommand,
  DeleteKnowledgeBaseCommand,
  SourceCommand,
  UpdateKnowledgeBaseCommand,
} from "../types/commands"

export interface AiKnowledgeService {
  list(signal?: AbortSignal): Promise<KnowledgeBase[]>
  create(command: CreateKnowledgeBaseCommand): Promise<KnowledgeBase>
  update(command: UpdateKnowledgeBaseCommand): Promise<KnowledgeBase>
  remove(command: DeleteKnowledgeBaseCommand): Promise<void>
  sources(id: KnowledgeBaseId, signal?: AbortSignal): Promise<KnowledgeSource[]>
  addFileSource(command: CreateFileSourceCommand): Promise<KnowledgeSource>
  addTextSource(command: CreateTextSourceCommand): Promise<KnowledgeSource>
  removeSource(command: SourceCommand): Promise<void>
  reindexSource(command: SourceCommand): Promise<KnowledgeSource>
}
