-- CreateTable
CREATE TABLE "possiveis_duplicatas" (
    "id" SERIAL NOT NULL,
    "lead_origem_id" INTEGER NOT NULL,
    "lead_duplicata_id" INTEGER NOT NULL,
    "tipo_match" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pendente',
    "resolvido_por" INTEGER,
    "resolvido_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "possiveis_duplicatas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "possiveis_duplicatas" ADD CONSTRAINT "possiveis_duplicatas_lead_origem_id_fkey" FOREIGN KEY ("lead_origem_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "possiveis_duplicatas" ADD CONSTRAINT "possiveis_duplicatas_lead_duplicata_id_fkey" FOREIGN KEY ("lead_duplicata_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
