-- CreateTable
CREATE TABLE "eventos_agenda" (
    "id" SERIAL NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "titulo" VARCHAR(255) NOT NULL,
    "descricao" TEXT,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "vendedor_id" INTEGER NOT NULL,
    "criado_por_id" INTEGER,
    "lead_id" INTEGER,
    "lead_sdr_id" INTEGER,
    "lead_sdr_inbound_id" INTEGER,
    "contato_nome" VARCHAR(255),
    "contato_telefone" VARCHAR(20),
    "cor" VARCHAR(20),
    "status_reuniao" VARCHAR(20),
    "lembrete_60_enviado" BOOLEAN NOT NULL DEFAULT false,
    "lembrete_30_enviado" BOOLEAN NOT NULL DEFAULT false,
    "marcado_em_horario_off" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "eventos_agenda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eventos_agenda_vendedor_id_inicio_idx" ON "eventos_agenda"("vendedor_id", "inicio");

-- CreateIndex
CREATE INDEX "eventos_agenda_inicio_idx" ON "eventos_agenda"("inicio");

-- AddForeignKey
ALTER TABLE "eventos_agenda" ADD CONSTRAINT "eventos_agenda_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
