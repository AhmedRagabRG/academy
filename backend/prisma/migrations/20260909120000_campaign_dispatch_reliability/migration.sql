-- PostgreSQL requires a newly-added enum value to be committed before it is
-- referenced by later statements. Keep this migration enum-only so fresh
-- deploys and Prisma shadow-database replays can safely use UNCERTAIN in the
-- following migration.
ALTER TYPE "CampaignRecipientStatus" ADD VALUE IF NOT EXISTS 'UNCERTAIN';
