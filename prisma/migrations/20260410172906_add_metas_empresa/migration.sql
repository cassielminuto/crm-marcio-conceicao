-- CreateTable
CREATE TABLE "metas_empresa" (
    "id" SERIAL NOT NULL,
    "periodo" VARCHAR(7) NOT NULL,
    "valor_meta" DECIMAL(12,2) NOT NULL,
    "leads_meta" INTEGER,
    "observacao" TEXT,
    "criado_por" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metas_empresa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "metas_empresa_periodo_key" ON "metas_empresa"("periodo");
