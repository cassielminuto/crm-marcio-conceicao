-- CreateEnum
CREATE TYPE "ContextoFasePrint" AS ENUM ('detalhe', 'handoff');

-- AlterTable
ALTER TABLE "leads_sdr" ADD COLUMN     "analise_ia_cache" JSONB;

-- AlterTable
ALTER TABLE "prints_conversa_sdr" ADD COLUMN     "analise_ia" JSONB,
ADD COLUMN     "contexto_fase" "ContextoFasePrint" NOT NULL DEFAULT 'detalhe';
