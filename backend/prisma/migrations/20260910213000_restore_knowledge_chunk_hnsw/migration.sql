-- Restores the HNSW index that migration 20260910210707 dropped.
--
-- Prisma cannot express `USING hnsw (embedding vector_cosine_ops)`, so it sees
-- the index as drift and `prisma migrate dev` proposes removing it. Accepting
-- that proposal is silent: retrieval keeps returning correct results, just by
-- sequential scan, so nothing looks broken until the knowledge base is large
-- enough to be slow.
--
-- If a future `migrate dev` proposes dropping this again, delete the generated
-- migration rather than applying it. test/integration/ai/knowledge.spec.ts
-- asserts the index exists so the loss cannot pass unnoticed.
CREATE INDEX IF NOT EXISTS "knowledge_chunk_embedding_idx" ON "KnowledgeChunk"
  USING hnsw (embedding vector_cosine_ops);
