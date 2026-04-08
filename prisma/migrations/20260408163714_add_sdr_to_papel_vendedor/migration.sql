-- AlterEnum
-- This migration needs to run OUTSIDE of a transaction.
-- Reason: ALTER TYPE ... ADD VALUE cannot run inside a transaction block in PostgreSQL.
-- Prisma 6.x detects this automatically when the SQL is the only statement in the file.

ALTER TYPE "PapelVendedor" ADD VALUE 'sdr';
