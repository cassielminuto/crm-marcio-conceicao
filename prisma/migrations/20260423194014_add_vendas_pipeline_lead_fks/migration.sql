-- AlterTable
ALTER TABLE "etapas_funil" ADD COLUMN     "pipeline" VARCHAR(30) NOT NULL DEFAULT 'comercial';

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "campanha_id" INTEGER,
ADD COLUMN     "criativo_id" INTEGER;

-- CreateTable
CREATE TABLE "vendas" (
    "id" SERIAL NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "campanha_id" INTEGER,
    "criativo_id" INTEGER,
    "hubla_invoice_id" VARCHAR(100),
    "produto" VARCHAR(255),
    "valor_total" DECIMAL(10,2) NOT NULL,
    "taxas" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valor_liquido" DECIMAL(10,2),
    "metodo_pagamento" VARCHAR(30),
    "parcelas" INTEGER,
    "order_bumps_aceitos" JSONB,
    "utms_checkout" JSONB,
    "fbclid_checkout" VARCHAR(255),
    "closer_responsavel_id" INTEGER,
    "origem_venda" VARCHAR(50),
    "recorrencia" BOOLEAN NOT NULL DEFAULT false,
    "data_pagamento" TIMESTAMP(3) NOT NULL,
    "ciclo_venda_dias" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendas_hubla_invoice_id_key" ON "vendas"("hubla_invoice_id");

-- CreateIndex
CREATE INDEX "vendas_lead_id_idx" ON "vendas"("lead_id");

-- CreateIndex
CREATE INDEX "vendas_data_pagamento_idx" ON "vendas"("data_pagamento");

-- CreateIndex
CREATE INDEX "vendas_campanha_id_data_pagamento_idx" ON "vendas"("campanha_id", "data_pagamento");

-- CreateIndex
CREATE INDEX "vendas_recorrencia_data_pagamento_idx" ON "vendas"("recorrencia", "data_pagamento");

-- CreateIndex
CREATE INDEX "etapas_funil_pipeline_ordem_idx" ON "etapas_funil"("pipeline", "ordem");

-- CreateIndex
CREATE INDEX "leads_campanha_id_idx" ON "leads"("campanha_id");

-- CreateIndex
CREATE INDEX "leads_criativo_id_idx" ON "leads"("criativo_id");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_campanha_id_fkey" FOREIGN KEY ("campanha_id") REFERENCES "campanhas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_criativo_id_fkey" FOREIGN KEY ("criativo_id") REFERENCES "criativos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_campanha_id_fkey" FOREIGN KEY ("campanha_id") REFERENCES "campanhas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_criativo_id_fkey" FOREIGN KEY ("criativo_id") REFERENCES "criativos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_closer_responsavel_id_fkey" FOREIGN KEY ("closer_responsavel_id") REFERENCES "vendedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
