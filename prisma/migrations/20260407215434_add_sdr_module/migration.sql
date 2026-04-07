-- CreateEnum
CREATE TYPE "TipoInteracaoSDR" AS ENUM ('curtiu', 'comentou', 'story', 'seguiu');

-- CreateEnum
CREATE TYPE "TemperaturaSDR" AS ENUM ('frio', 'morno', 'quente');

-- CreateEnum
CREATE TYPE "TentouSolucao" AS ENUM ('sim', 'nao', 'parcialmente');

-- CreateEnum
CREATE TYPE "DecisaoRota" AS ENUM ('convidar', 'lixeira');

-- CreateEnum
CREATE TYPE "AceitouDiagnostico" AS ENUM ('sim', 'nao', 'pendente');

-- CreateEnum
CREATE TYPE "TomEmocional" AS ENUM ('desesperado', 'racional', 'resistente', 'aberto', 'fragil');

-- AlterTable
ALTER TABLE "etapas_funil" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "produto_hubla" VARCHAR(255);

-- AlterTable
ALTER TABLE "vendedores" ADD COLUMN     "acesso_sdr" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "leads_sdr" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "instagram" VARCHAR(255) NOT NULL,
    "tipo_interacao" "TipoInteracaoSDR" NOT NULL,
    "data_primeiro_contato" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mensagem_enviada" TEXT,
    "resposta_lead" TEXT,
    "temperatura_inicial" "TemperaturaSDR",
    "dor_aparente" TEXT,
    "tentou_solucao_anterior" "TentouSolucao",
    "temperatura_final" "TemperaturaSDR",
    "decisao_rota" "DecisaoRota",
    "detalhe_situacao" TEXT,
    "aceitou_diagnostico" "AceitouDiagnostico",
    "etapa" VARCHAR(50) NOT NULL DEFAULT 'f1_abertura',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "whatsapp" VARCHAR(20),
    "data_reuniao" TIMESTAMP(3),
    "closer_destino_id" INTEGER,
    "resumo_situacao" TEXT,
    "tom_emocional" "TomEmocional",
    "oque_funcionou" TEXT,
    "oque_evitar" TEXT,
    "frase_chave_lead" TEXT,
    "resumo_ia" TEXT,
    "lead_closer_id" INTEGER,
    "handoff_realizado_em" TIMESTAMP(3),
    "operador_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_sdr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prints_conversa_sdr" (
    "id" SERIAL NOT NULL,
    "lead_sdr_id" INTEGER NOT NULL,
    "imagem_url" VARCHAR(500) NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prints_conversa_sdr_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "leads_sdr" ADD CONSTRAINT "leads_sdr_closer_destino_id_fkey" FOREIGN KEY ("closer_destino_id") REFERENCES "vendedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads_sdr" ADD CONSTRAINT "leads_sdr_lead_closer_id_fkey" FOREIGN KEY ("lead_closer_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads_sdr" ADD CONSTRAINT "leads_sdr_operador_id_fkey" FOREIGN KEY ("operador_id") REFERENCES "vendedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prints_conversa_sdr" ADD CONSTRAINT "prints_conversa_sdr_lead_sdr_id_fkey" FOREIGN KEY ("lead_sdr_id") REFERENCES "leads_sdr"("id") ON DELETE CASCADE ON UPDATE CASCADE;
