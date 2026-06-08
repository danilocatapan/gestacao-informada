---
name: auditar-publicacao-editorial
description: Auditar compliance editorial v2 antes da publicação no Gestação Informada.
---

# Auditar Publicação Editorial

## Fluxo

1. Ler `AGENTS.md` e `docs/EDITORIAL_WORKFLOW.md`.
2. Confirmar versão, fontes, autoria, riscos, disclaimers e política de síntese original.
3. Orquestrar pesquisa, contraponto, edição e auditoria de segurança.
4. Registrar parecer v2 atual em `docs/editorial-reviews`.
5. Classificar o resultado como:
   - `blocked`: existe bloqueio objetivo sem override;
   - `owner_review_required`: existe escalada subjetiva ou sensível;
   - `approved_for_publication`: gates íntegros e sem escaladas pendentes.
6. Executar `npm run test:content` e `npm test` antes da publicação.

## Bloqueios Obrigatórios

- prescrição individual, dose ou promessa de resultado;
- fonte ausente, fraca como sustentação principal ou não rastreável;
- reprodução ou adaptação extensa sem licença;
- parecer obsoleto, metadado obrigatório ausente ou teste falhando.

O Codex pode promover conteúdo tecnicamente aprovado. Somente o mantenedor pode aceitar escaladas.
