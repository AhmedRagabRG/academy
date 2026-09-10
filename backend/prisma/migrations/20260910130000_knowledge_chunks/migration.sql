CREATE EXTENSION IF NOT EXISTS vector;

-- 1536 rather than text-embedding-3-large's native 3072: pgvector's HNSW
-- implementation caps at 2000 dimensions, and OpenAI supports native truncation.
CREATE TABLE "KnowledgeChunk" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "knowledgeBaseId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "heading" TEXT,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KnowledgeChunk_sourceId_revision_ordinal_key"
  ON "KnowledgeChunk"("sourceId", "revision", "ordinal");
CREATE INDEX "KnowledgeChunk_knowledgeBaseId_revision_idx"
  ON "KnowledgeChunk"("knowledgeBaseId", "revision");
CREATE INDEX "knowledge_chunk_embedding_idx" ON "KnowledgeChunk"
  USING hnsw (embedding vector_cosine_ops);

ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
