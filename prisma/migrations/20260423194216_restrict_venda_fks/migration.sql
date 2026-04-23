-- DropForeignKey
ALTER TABLE "vendas" DROP CONSTRAINT "vendas_campanha_id_fkey";

-- DropForeignKey
ALTER TABLE "vendas" DROP CONSTRAINT "vendas_closer_responsavel_id_fkey";

-- DropForeignKey
ALTER TABLE "vendas" DROP CONSTRAINT "vendas_criativo_id_fkey";

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_campanha_id_fkey" FOREIGN KEY ("campanha_id") REFERENCES "campanhas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_criativo_id_fkey" FOREIGN KEY ("criativo_id") REFERENCES "criativos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_closer_responsavel_id_fkey" FOREIGN KEY ("closer_responsavel_id") REFERENCES "vendedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
