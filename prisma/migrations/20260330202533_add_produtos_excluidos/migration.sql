-- AlterTable
ALTER TABLE "etapas_funil" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "produto_hubla" TEXT;

-- CreateTable
CREATE TABLE "produtos_excluidos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criado_por" INTEGER,

    CONSTRAINT "produtos_excluidos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "produtos_excluidos_nome_key" ON "produtos_excluidos"("nome");
