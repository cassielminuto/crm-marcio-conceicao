-- Renumerar: empurrar etapas com ordem >= 5 (follow_up, proposta, negociacao, fechado_ganho, fechado_perdido, nurturing)
UPDATE "etapas_funil" SET "ordem" = "ordem" + 1 WHERE "ordem" >= 5;

-- Inserir etapa no_show na posição 5 (logo depois de qualificado)
INSERT INTO "etapas_funil" ("slug", "label", "cor", "ordem", "ativo", "tipo", "created_at", "updated_at")
VALUES ('no_show', 'No-Show', '#EF4444', 5, true, 'normal', NOW(), NOW());
