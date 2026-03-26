-- Converter coluna etapa_funil de enum para varchar no leads
ALTER TABLE "leads" ALTER COLUMN "etapa_funil" TYPE VARCHAR(100) USING "etapa_funil"::VARCHAR;
ALTER TABLE "leads" ALTER COLUMN "etapa_funil" SET DEFAULT 'novo';

-- Converter no templates_mensagem
ALTER TABLE "templates_mensagem" ALTER COLUMN "etapa_funil" TYPE VARCHAR(100) USING "etapa_funil"::VARCHAR;

-- Ampliar varchar no funil_historico
ALTER TABLE "funil_historico" ALTER COLUMN "etapa_anterior" TYPE VARCHAR(100);
ALTER TABLE "funil_historico" ALTER COLUMN "etapa_nova" TYPE VARCHAR(100);
ALTER TABLE "funil_historico" ALTER COLUMN "etapa_nova" DROP NOT NULL;

-- Dropar o enum
DROP TYPE IF EXISTS "EtapaFunil";

-- Criar tabela de configuração
CREATE TABLE "etapas_funil" (
  "id" SERIAL PRIMARY KEY,
  "slug" VARCHAR(100) UNIQUE NOT NULL,
  "label" VARCHAR(100) NOT NULL,
  "cor" VARCHAR(20) NOT NULL DEFAULT '#6c5ce7',
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "tipo" VARCHAR(20) NOT NULL DEFAULT 'normal',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Popular com etapas padrão
INSERT INTO "etapas_funil" ("slug", "label", "cor", "ordem", "tipo") VALUES
  ('novo', 'Novo', '#3b82f6', 1, 'normal'),
  ('em_abordagem', 'Em Abordagem', '#eab308', 2, 'normal'),
  ('qualificado', 'Qualificado', '#a855f7', 3, 'normal'),
  ('proposta', 'Proposta', '#f97316', 4, 'normal'),
  ('fechado_ganho', 'Fechado Ganho', '#22c55e', 5, 'ganho'),
  ('fechado_perdido', 'Fechado Perdido', '#ef4444', 6, 'perdido'),
  ('nurturing', 'Nurturing', '#6b7280', 7, 'normal');
