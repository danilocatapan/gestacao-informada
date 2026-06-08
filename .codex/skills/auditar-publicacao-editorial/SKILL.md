---
name: auditar-publicacao-editorial
description: Auditar compliance editorial antes da publicação no Gestação Informada. Use ao avaliar conteúdo para publicação, revisar mudanças de status, verificar registros de aprovação ou investigar falhas dos gates editoriais.
---

# Auditar Publicação Editorial

## Princípio

Operar sempre de forma fail-closed. Nunca conceder aprovação clínica, psicológica, jurídica ou editorial; nunca promover conteúdo para `approved`; nunca interpretar ausência de evidência como aprovação.

## Fluxo

1. Ler `AGENTS.md` e `docs/EDITORIAL_WORKFLOW.md`.
2. Identificar o conteúdo, estado, versão e domínios de risco declarados.
3. Validar autoria, fontes, datas e metadados obrigatórios.
4. Cruzar `src/content/editorial-records` com participantes e papéis em `src/content/contributors`.
5. Confirmar revisões atuais para cada domínio, aprovação editorial independente e transição válida.
6. Executar `npm run test:content`; executar `npm test` antes de considerar a auditoria completa.
7. Informar somente um resultado:
   - `bloqueado`: listar cada ausência, inconsistência, rejeição ou risco.
   - `apto para avaliação humana`: gates técnicos íntegros, sem afirmar que o conteúdo está profissionalmente aprovado.

## Bloqueios Obrigatórios

- status diferente de `approved` para publicação;
- metadado, fonte, autoria ou data obrigatória ausente;
- domínio sensível sem revisão correspondente;
- revisor incompatível, inexistente ou sem credencial registrada;
- autor, revisor ou aprovador editorial acumulando papéis no mesmo conteúdo;
- aprovação anterior à última atualização;
- rejeição mais recente em qualquer domínio;
- transição direta de `draft` para `approved`;
- registro ausente, ambíguo ou inconsistente;
- falha em qualquer teste editorial ou de build.

Não corrigir automaticamente conteúdo, registros, decisões ou status durante uma auditoria.
