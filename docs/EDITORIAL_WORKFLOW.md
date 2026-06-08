# Fluxo Editorial Simplificado

## Princípios

- Conteúdo governado declara `riskDomains`, autoria, fontes, datas e disclaimers aplicáveis.
- O portal produz síntese original rastreável. Referência não autoriza reprodução ou adaptação extensa.
- O Codex orquestra pesquisa, contraponto, edição e auditoria de segurança.
- O parecer editorial v2 é a evidência canônica da auditoria.
- O portal não apresenta auditoria por IA como revisão profissional.

## Estados e decisões

| Parecer v2 | Estado do conteúdo | Resultado |
|---|---|---|
| `blocked` | `draft` | Exige correção; não aceita override |
| `owner_review_required` | `in_review` | Aguarda um OK do mantenedor vinculado ao hash |
| `approved_for_publication` | `approved` | Pode gerar rota pública após testes, PR e CI |

Conteúdo limpo pode ir diretamente de `draft` para `approved`. Qualquer alteração invalida o parecer e o OK anteriores.

## Bloqueios objetivos

- prescrição individual, doses, promessa de cura ou resultado;
- fonte ausente, não rastreável ou inadequada como sustentação principal;
- reprodução ou adaptação extensa sem licença;
- metadado ou disclaimer obrigatório ausente;
- parecer obsoleto ou teste falhando.

Bloqueios objetivos nunca podem ser aceitos pelo mantenedor. Devem ser corrigidos e auditados novamente.

## Escaladas

Decisões subjetivas ou sensíveis podem ser mantidas somente após o mantenedor digitar `Estou ciente e aprovo` e registrar justificativa no painel local. O OK não constitui revisão clínica, psicológica ou jurídica.

## Publicação

1. Codex cria ou atualiza uma síntese original baseada em fontes rastreáveis.
2. `npm run editorial:review -- <collection/id>` gera o parecer v2.
3. Correções são resolvidas no painel local.
4. Conteúdo sem escaladas é promovido tecnicamente; conteúdo escalado aguarda o OK.
5. `npm run test:content`, `npm test` e E2E devem passar.
6. Codex abre PR; CI verde, merge em `main` e GitHub Pages concluem a publicação.

O painel escuta apenas em `127.0.0.1` e não possui credenciais GitHub.
