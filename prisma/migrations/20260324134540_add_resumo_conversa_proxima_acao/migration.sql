-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "proxima_acao" TEXT,
ADD COLUMN     "proxima_acao_data" TIMESTAMP(3),
ADD COLUMN     "resumo_conversa" TEXT;
