# Fluxo Editorial Seguro e Auditável

## Regras

- Todo conteúdo publicável deve declarar `status`, `contentType`, `clinical` e `riskDomains`.
- Os estados permitidos são `draft`, `in_review`, `approved` e `archived`.
- Os domínios de risco permitidos são `clinical`, `psychological` e `legal`.
- Conteúdo clínico deve residir em `articles` e declarar `clinical` em `riskDomains`.
- Documento jurídico deve declarar `legal` em `riskDomains`.
- Páginas institucionais de baixo risco podem usar `riskDomains: []` somente quando não apresentarem orientação ou afirmações clínicas, psicológicas ou jurídicas.
- Todo artigo aprovado exige autoria identificada, fontes rastreáveis, data de atualização, aprovações dos domínios declarados e aprovação editorial final.
- Autor, revisores profissionais e aprovador editorial devem ser participantes distintos.
- Alterar o conteúdo invalida registros cuja `contentUpdatedAt` não corresponda à versão atual.
- Ausência, inconsistência, rejeição vigente ou ambiguidade bloqueia a publicação.
- Codex e automações nunca substituem aprovação profissional humana.

## Papéis

| Papel | Responsabilidade | Autoridade |
|---|---|---|
| Autor | Produzir conteúdo, preencher metadados, declarar riscos e submeter para revisão | Não pode revisar nem aprovar o próprio conteúdo |
| Revisor clínico | Avaliar evidências, precisão, limites e segurança clínica | Decide apenas sobre o domínio clínico |
| Revisor psicológico | Avaliar segurança emocional, linguagem e riscos psicológicos | Decide apenas sobre o domínio psicológico |
| Revisor jurídico | Avaliar afirmações jurídicas, atualização normativa e compliance | Decide apenas sobre o domínio jurídico |
| Aprovador editorial | Confirmar integridade do fluxo, independência e metadados | Concede a aprovação editorial final, sem substituir revisões profissionais |
| Agente Codex | Auditar metadados, registros, testes e bloqueios | Informa `bloqueado` ou `apto para avaliação humana`; nunca aprova ou promove status |

Cada participante deve existir em `src/content/contributors` e declarar seus `editorialRoles`. Credenciais profissionais devem ser verificáveis antes de registrar uma revisão.

## Estados Editoriais

| Estado | Uso | Rota pública |
|---|---|---|
| `draft` | Elaboração ou correção | Não |
| `in_review` | Revisões profissionais e editorial em andamento | Não |
| `approved` | Gates completos e aprovação formal registrada | Sim |
| `archived` | Conteúdo retirado de circulação | Não |

Transições permitidas:

| Origem | Destino | Condição |
|---|---|---|
| `draft` | `in_review` | Metadados preenchidos e submissão registrada |
| `in_review` | `draft` | Correção solicitada ou conteúdo alterado |
| `in_review` | `approved` | Revisões exigidas e aprovação editorial válidas |
| `approved` | `draft` | Atualização que exige nova rodada de revisão |
| `approved` | `archived` | Retirada justificada |
| `archived` | `draft` | Reabertura para atualização e nova revisão |

A promoção direta de `draft` para `approved` é inválida.

## Fluxo de Publicação

1. O autor cria ou atualiza o conteúdo em `draft`, declara `riskDomains`, autoria, fontes e datas.
2. A submissão para revisão é registrada e o conteúdo muda para `in_review`.
3. Cada domínio declarado recebe uma revisão registrada por profissional compatível.
4. A decisão mais recente de cada domínio deve ser `approved` e corresponder à versão atual.
5. O aprovador editorial distinto confirma a integridade do fluxo.
6. A transição de `in_review` para `approved` é registrada.
7. A skill `auditar-publicacao-editorial`, `npm run test:content` e `npm test` devem passar.
8. Somente então a geração estática pode criar rota pública.

Os registros ficam em `src/content/editorial-records` e contêm:

| Campo | Finalidade |
|---|---|
| `target` | Conteúdo auditado, como `articles/identificador` |
| `event` | Submissão, revisão de domínio, aprovação editorial ou transição |
| `actor` e `role` | Participante e papel exercido |
| `domain` e `decision` | Domínio e decisão, quando aplicáveis |
| `occurredAt` | Momento auditável do evento |
| `contentUpdatedAt` | Versão exata avaliada |
| `fromStatus` e `toStatus` | Estados da transição |
| `justification` | Fundamentação da decisão ou tramitação |

## Testes

- `npm run test:content` audita o repositório e executa cenários negativos determinísticos.
- `npm test` executa tipagem, gate editorial, build e verificação de ausência de rotas não publicáveis.
- O CI e o deploy executam os gates antes de merge e publicação.
- Devem falhar: metadados ausentes, revisão incompatível ou ausente, papéis acumulados, aprovação obsoleta, rejeição vigente, transição inválida e vazamento de estado não aprovado.

## Justificativa

Conteúdo clínico, psicológico e jurídico pode influenciar decisões em contexto de vulnerabilidade. As travas reduzem riscos de dano, desinformação, responsabilização jurídica, exposição criminal e perda de confiança. O sistema opera de forma fail-closed: intenção futura, revisão informal ou validação automatizada isolada nunca autorizam publicação.

## Conclusões e Próximos Passos

- O fluxo técnico está definido e auditável, mas não nomeia nem valida revisores humanos.
- Os artigos clínicos e documentos jurídicos existentes permanecem bloqueados.
- A publicação futura depende de registros humanos íntegros, testes verdes e revisão recorrente das fontes.
