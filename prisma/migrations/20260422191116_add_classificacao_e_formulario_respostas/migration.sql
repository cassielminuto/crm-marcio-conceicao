-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "classificacao" VARCHAR(20),
ADD COLUMN     "fbclid" VARCHAR(255),
ADD COLUMN     "gclid" VARCHAR(255);

-- CreateTable
CREATE TABLE "formulario_respostas" (
    "id" SERIAL NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "formulario_tipo" VARCHAR(50) NOT NULL,
    "formulario_origem" VARCHAR(255),
    "respostas" JSONB NOT NULL,
    "score_calculado" INTEGER,
    "classificacao" VARCHAR(20),
    "submitted_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "formulario_respostas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "formulario_respostas_lead_id_idx" ON "formulario_respostas"("lead_id");

-- CreateIndex
CREATE INDEX "formulario_respostas_formulario_tipo_submitted_at_idx" ON "formulario_respostas"("formulario_tipo", "submitted_at");

-- AddForeignKey
ALTER TABLE "formulario_respostas" ADD CONSTRAINT "formulario_respostas_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
