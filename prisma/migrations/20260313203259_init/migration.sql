-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('admin', 'gestor', 'vendedor');

-- CreateEnum
CREATE TYPE "PapelVendedor" AS ENUM ('closer_lider', 'closer_independente', 'trainee');

-- CreateEnum
CREATE TYPE "CanalLead" AS ENUM ('bio', 'anuncio', 'evento');

-- CreateEnum
CREATE TYPE "ClasseLead" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "EtapaFunil" AS ENUM ('novo', 'em_abordagem', 'qualificado', 'proposta', 'fechado_ganho', 'fechado_perdido', 'nurturing');

-- CreateEnum
CREATE TYPE "StatusLead" AS ENUM ('aguardando', 'em_abordagem', 'convertido', 'perdido', 'nurturing');

-- CreateEnum
CREATE TYPE "TracoCarater" AS ENUM ('esquizoide', 'oral', 'masoquista', 'rigido', 'nao_identificado');

-- CreateEnum
CREATE TYPE "ResultadoCall" AS ENUM ('fechou', 'nao_fechou', 'reagendar', 'sem_call');

-- CreateEnum
CREATE TYPE "TipoInteracao" AS ENUM ('call', 'whatsapp_enviado', 'whatsapp_recebido', 'nota', 'email');

-- CreateEnum
CREATE TYPE "TipoFollowUp" AS ENUM ('whatsapp', 'call', 'email');

-- CreateEnum
CREATE TYPE "StatusFollowUp" AS ENUM ('pendente', 'executado', 'atrasado', 'cancelado');

-- CreateEnum
CREATE TYPE "TipoTemplate" AS ENUM ('whatsapp', 'email');

-- CreateEnum
CREATE TYPE "ClasseTemplate" AS ENUM ('A', 'B', 'C', 'todos');

-- CreateEnum
CREATE TYPE "StatusMeta" AS ENUM ('em_andamento', 'atingida', 'nao_atingida');

-- CreateEnum
CREATE TYPE "StatusProposta" AS ENUM ('rascunho', 'enviada', 'visualizada', 'aceita', 'recusada');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "senha_hash" VARCHAR(255) NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendedores" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "nome_exibicao" VARCHAR(100),
    "papel" "PapelVendedor" NOT NULL,
    "classes_atendidas" TEXT[],
    "score_performance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leads_ativos" INTEGER NOT NULL DEFAULT 0,
    "leads_max" INTEGER NOT NULL DEFAULT 30,
    "total_conversoes" INTEGER NOT NULL DEFAULT 0,
    "ticket_medio" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ranking_posicao" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "vendedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" SERIAL NOT NULL,
    "respondi_id" VARCHAR(255),
    "nome" VARCHAR(255) NOT NULL,
    "telefone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "canal" "CanalLead" NOT NULL,
    "formulario_titulo" VARCHAR(255),
    "pontuacao" INTEGER NOT NULL DEFAULT 0,
    "classe" "ClasseLead" NOT NULL,
    "etapa_funil" "EtapaFunil" NOT NULL DEFAULT 'novo',
    "vendedor_id" INTEGER,
    "status" "StatusLead" NOT NULL DEFAULT 'aguardando',
    "dados_respondi" JSONB,
    "dor_principal" TEXT,
    "traco_carater" "TracoCarater",
    "objecao_principal" TEXT,
    "resultado_call" "ResultadoCall",
    "venda_realizada" BOOLEAN NOT NULL DEFAULT false,
    "valor_venda" DECIMAL(10,2),
    "data_preenchimento" TIMESTAMP(3),
    "data_atribuicao" TIMESTAMP(3),
    "data_abordagem" TIMESTAMP(3),
    "data_conversao" TIMESTAMP(3),
    "motivo_perda" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interacoes" (
    "id" SERIAL NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "vendedor_id" INTEGER NOT NULL,
    "tipo" "TipoInteracao" NOT NULL,
    "conteudo" TEXT,
    "gravacao_url" VARCHAR(500),
    "transcricao" TEXT,
    "resumo_ia" TEXT,
    "campos_ia" JSONB,
    "duracao" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_ups" (
    "id" SERIAL NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "vendedor_id" INTEGER NOT NULL,
    "data_programada" TIMESTAMP(3) NOT NULL,
    "data_executada" TIMESTAMP(3),
    "tipo" "TipoFollowUp" NOT NULL,
    "status" "StatusFollowUp" NOT NULL DEFAULT 'pendente',
    "template_id" INTEGER,
    "mensagem_enviada" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates_mensagem" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "conteudo" TEXT NOT NULL,
    "etapa_funil" "EtapaFunil",
    "classe_lead" "ClasseTemplate" NOT NULL DEFAULT 'todos',
    "tipo" "TipoTemplate" NOT NULL DEFAULT 'whatsapp',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "templates_mensagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metas" (
    "id" SERIAL NOT NULL,
    "vendedor_id" INTEGER NOT NULL,
    "periodo" VARCHAR(20) NOT NULL,
    "valor_meta" DECIMAL(10,2) NOT NULL,
    "valor_atual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "percentual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leads_meta" INTEGER,
    "leads_atual" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusMeta" NOT NULL DEFAULT 'em_andamento',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funil_historico" (
    "id" SERIAL NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "etapa_anterior" VARCHAR(50),
    "etapa_nova" VARCHAR(50) NOT NULL,
    "vendedor_id" INTEGER,
    "motivo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funil_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_config" (
    "id" SERIAL NOT NULL,
    "classe_lead" "ClasseLead" NOT NULL,
    "tempo_maximo_minutos" INTEGER NOT NULL,
    "alerta_amarelo_pct" INTEGER NOT NULL DEFAULT 50,
    "alerta_vermelho_pct" INTEGER NOT NULL DEFAULT 80,
    "redistribuir_ao_estourar" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sla_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamificacao" (
    "id" SERIAL NOT NULL,
    "vendedor_id" INTEGER NOT NULL,
    "pontos" INTEGER NOT NULL DEFAULT 0,
    "badges" JSONB NOT NULL DEFAULT '[]',
    "periodo" VARCHAR(20) NOT NULL,
    "ranking" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gamificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "acao" VARCHAR(50) NOT NULL,
    "entidade" VARCHAR(50) NOT NULL,
    "entidade_id" INTEGER,
    "dados_anteriores" JSONB,
    "dados_novos" JSONB,
    "ip" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propostas" (
    "id" SERIAL NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "vendedor_id" INTEGER NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "status" "StatusProposta" NOT NULL DEFAULT 'rascunho',
    "url_documento" VARCHAR(500),
    "aberturas" INTEGER NOT NULL DEFAULT 0,
    "data_envio" TIMESTAMP(3),
    "data_assinatura" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "propostas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vendedores_usuario_id_key" ON "vendedores"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "leads_respondi_id_key" ON "leads"("respondi_id");

-- CreateIndex
CREATE UNIQUE INDEX "sla_config_classe_lead_key" ON "sla_config"("classe_lead");

-- AddForeignKey
ALTER TABLE "vendedores" ADD CONSTRAINT "vendedores_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interacoes" ADD CONSTRAINT "interacoes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interacoes" ADD CONSTRAINT "interacoes_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates_mensagem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas" ADD CONSTRAINT "metas_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funil_historico" ADD CONSTRAINT "funil_historico_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funil_historico" ADD CONSTRAINT "funil_historico_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamificacao" ADD CONSTRAINT "gamificacao_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propostas" ADD CONSTRAINT "propostas_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propostas" ADD CONSTRAINT "propostas_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
