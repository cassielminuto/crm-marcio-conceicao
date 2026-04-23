-- CreateTable
CREATE TABLE "campanhas" (
    "id" SERIAL NOT NULL,
    "meta_campaign_id" VARCHAR(50),
    "nome" VARCHAR(255) NOT NULL,
    "estrategia" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ativa',
    "budget_diario" DECIMAL(10,2),
    "gasto_acumulado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "data_inicio" TIMESTAMP(3),
    "data_fim" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campanhas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "criativos" (
    "id" SERIAL NOT NULL,
    "campanha_id" INTEGER NOT NULL,
    "meta_ad_id" VARCHAR(50),
    "nome" VARCHAR(255) NOT NULL,
    "formato" VARCHAR(30) NOT NULL,
    "angulo" VARCHAR(30),
    "narrativa" VARCHAR(30),
    "origem_producao" VARCHAR(20),
    "gasto_acumulado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "impressoes" BIGINT NOT NULL DEFAULT 0,
    "cliques" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION,
    "cpc" DECIMAL(8,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "criativos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campanhas_meta_campaign_id_key" ON "campanhas"("meta_campaign_id");

-- CreateIndex
CREATE INDEX "campanhas_estrategia_status_idx" ON "campanhas"("estrategia", "status");

-- CreateIndex
CREATE UNIQUE INDEX "criativos_meta_ad_id_key" ON "criativos"("meta_ad_id");

-- CreateIndex
CREATE INDEX "criativos_campanha_id_idx" ON "criativos"("campanha_id");

-- AddForeignKey
ALTER TABLE "criativos" ADD CONSTRAINT "criativos_campanha_id_fkey" FOREIGN KEY ("campanha_id") REFERENCES "campanhas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
