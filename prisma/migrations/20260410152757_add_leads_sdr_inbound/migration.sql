-- CreateTable
CREATE TABLE "leads_sdr_inbound" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "telefone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "dor_principal" TEXT,
    "formulario_origem" VARCHAR(255),
    "dados_respondi" JSONB,
    "operador_id" INTEGER NOT NULL,
    "etapa" VARCHAR(50) NOT NULL DEFAULT 'novo_lead',
    "classe" VARCHAR(10),
    "observacoes" TEXT,
    "proximo_passo" TEXT,
    "data_reuniao" TIMESTAMP(3),
    "closer_destino_id" INTEGER,
    "lead_closer_id" INTEGER,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "leads_sdr_inbound_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_sdr_inbound_operador_id_etapa_idx" ON "leads_sdr_inbound"("operador_id", "etapa");

-- CreateIndex
CREATE INDEX "leads_sdr_inbound_telefone_idx" ON "leads_sdr_inbound"("telefone");

-- AddForeignKey
ALTER TABLE "leads_sdr_inbound" ADD CONSTRAINT "leads_sdr_inbound_operador_id_fkey" FOREIGN KEY ("operador_id") REFERENCES "vendedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads_sdr_inbound" ADD CONSTRAINT "leads_sdr_inbound_closer_destino_id_fkey" FOREIGN KEY ("closer_destino_id") REFERENCES "vendedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
