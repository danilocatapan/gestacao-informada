# Instruções para agentes

## Contexto

Gestação Informada será um portal brasileiro de informação responsável e acolhimento para famílias afetadas por perda gestacional.

Antes de alterar o produto, leia:

- `docs/PRODUCT.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`

Use a skill local `.codex/skills/gestacao-informada/SKILL.md` em tarefas de produto, conteúdo clínico, arquitetura ou desenvolvimento deste repositório.

## Regras essenciais

- Não apresentar conteúdo como diagnóstico, prescrição ou recomendação individual.
- Não publicar doses, calculadoras de medicamentos ou cronogramas terapêuticos.
- Diferenciar evidências, diretrizes, opiniões profissionais e relatos pessoais.
- Exigir fonte, autoria e data de revisão para conteúdo clínico.
- Tratar perda gestacional e luto com linguagem respeitosa, sem falsas promessas.
- Não expor dados pessoais, clínicos ou relatos identificáveis sem consentimento documentado.

## Desenvolvimento

- Registrar decisões estruturais relevantes em `docs/DECISIONS.md`.
- Manter mudanças pequenas, verificáveis e alinhadas ao roadmap.
- Incluir testes proporcionais ao risco quando houver código.
- Garantir acessibilidade e experiência responsiva nas interfaces.
- Nunca incluir segredos ou credenciais no repositório.

## Reconciliação documental obrigatória

Antes de concluir qualquer tarefa:

1. Comparar a implementação real com `docs/ROADMAP.md`.
2. Atualizar progresso, bloqueios, escopo e dependências no roadmap quando tiverem mudado.
3. Revisar os documentos afetados e registrar decisões estruturais relevantes em `docs/DECISIONS.md`.
4. Revisar `.agents/` e as skills locais quando responsabilidades, interfaces, limites de autoridade ou fluxos tiverem mudado.
5. Não marcar um item como concluído sem implementação e validação correspondentes.
6. Diferenciar explicitamente:
   - infraestrutura implementada;
   - conteúdo preparado;
   - publicação bloqueada;
   - entrega efetivamente pública.
7. Evitar alterações artificiais em roadmap, documentação, agentes ou skills quando não houver impacto real.
8. Manter toda documentação em português do Brasil com ortografia e acentuação corretas.

Na resposta final, informar:

- documentos e contratos de agentes revisados;
- documentos e contratos de agentes alterados;
- divergências encontradas e corrigidas;
- atualizações consideradas desnecessárias e o motivo.

## Regras canônicas de implementação

- Não adicionar framework de componentes por padrão. Islands React ou Preact exigem necessidade real e decisão registrada.
- Usar `withBaseUrl()` para paths relativos e `withCanonicalUrl()` para URLs absolutas. Não concatenar o base path manualmente.
- Artigos médicos devem residir na collection `articles`; termos clínicos devem residir em `glossary`. Conteúdo clínico nunca deve ser hardcoded em componentes ou páginas.
- Artigos médicos somente podem gerar rota pública com `status: approved` e parecer editorial v2 atual com decisão `approved_for_publication`.
- Seguir `docs/EDITORIAL_WORKFLOW.md`; conteúdo sensível deve declarar `riskDomains` e possuir parecer atual em `docs/editorial-reviews`.
- Codex pode aprovar tecnicamente e promover conteúdo sem escaladas; decisões subjetivas ou sensíveis exigem OK do mantenedor no painel.
- Bloqueios objetivos nunca aceitam override.
- Toda ocorrência publicável de termo sensível exige auditoria documentada em `safetyReview`.
- `npm run test:content` deve rodar antes do commit. O CI é o gate obrigatório para merge e deploy.
- Toda entrega de interface deve ser validada com Playwright em desktop e mobile, cobrindo todas as rotas e fluxos alterados.
- Salvar screenshots de evidência em `docs/qa/screenshots/` e verificar overflow, componentes quebrados e erros de console.
- Todo texto visível da interface deve estar em português do Brasil, com linguagem clara, limpa, profissional e acolhedora.

## Economia de tokens e contexto

- Sempre prefixar com `rtk` os comandos de terminal compatíveis para reduzir o consumo de tokens.
- Quando `rtk` não executar diretamente um cmdlet interno do PowerShell, preferir um comando equivalente compatível ou usar `rtk proxy`; executar sem `rtk` apenas quando não houver alternativa funcional.
- Consultar o contexto do projeto de forma incremental: começar por este arquivo, pela skill local e pelos documentos obrigatórios relevantes para a tarefa.
- Usar buscas direcionadas, como `rtk rg`, antes de abrir arquivos inteiros ou explorar diretórios amplos.
- Evitar reler arquivos, carregar saídas extensas ou incluir contexto que não contribua diretamente para a tarefa atual.
- Usar `rtk gain` periodicamente para acompanhar a economia de tokens.
