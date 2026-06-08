# Relatório de prontidão dos artigos do MVP

Data da auditoria Codex: 8 de junho de 2026

## Resultado

**Bloqueado para publicação.**

Os seis artigos prioritários foram pesquisados, redigidos, submetidos para revisão e auditados
tecnicamente com assistência de IA. Todos estão em `in_review`, sem rotas públicas.

A auditoria confirmou:

- 6 artigos preparados e submetidos para revisão;
- 6 registros de submissão e 6 transições válidas de `draft` para `in_review`;
- 0 revisões profissionais por domínio;
- 0 aprovações editoriais independentes;
- 0 transições para `approved`;
- 0 artigos profissionalmente aprovados;
- 0 artigos publicados.

Os pareceres automatizados não possuem apontamentos pendentes ou bloqueantes, mas mantêm
`publicationAllowed: false`. A auditoria Codex verifica estrutura, fontes, riscos, linguagem,
metadados e bloqueios; ela não concede aprovação clínica, psicológica ou editorial.

## Inventário

| Artigo | Domínios | Fontes | Estado | Auditoria Codex | Publicação |
|---|---|---:|---|---|---|
| `entendendo-a-perda-gestacional` | clinical, psychological | 3 | in_review | Triagem técnica concluída | Bloqueada |
| `gestacao-apos-perda` | clinical, psychological | 3 | in_review | Triagem técnica concluída | Bloqueada |
| `investigacao-apos-perdas-recorrentes` | clinical, psychological | 3 | in_review | Triagem técnica concluída | Bloqueada |
| `trombofilias-hereditarias-e-adquiridas` | clinical | 3 | in_review | Triagem técnica concluída | Bloqueada |
| `sindrome-antifosfolipide` | clinical | 3 | in_review | Triagem técnica concluída | Bloqueada |
| `mthfr-evidencias-e-incertezas` | clinical | 4 | in_review | Triagem técnica concluída | Bloqueada |
| `rascunho-principios-editoriais` | clinical | 0 | draft | Fixture técnico | Excluído da meta |

## Auditoria Técnica Consolidada

- Todos os artigos declaram autoria, domínios de risco, fontes, data de atualização, disclaimer
  médico e transparência sobre assistência de IA.
- As fontes declaradas estão centralizadas e priorizam diretrizes ou materiais institucionais de
  ACOG, ASH, CDC, ESHRE, EULAR, Ministério da Saúde e RCOG.
- Os textos evitam doses, protocolos, promessas de resultado e orientações para iniciar, suspender
  ou alterar medicamentos.
- Divergências entre diretrizes são apresentadas principalmente no artigo sobre investigação após
  perdas recorrentes e no artigo sobre MTHFR.
- Matrizes de afirmações mantêm a coluna `Pendência humana`, deixando explícito que a validação
  profissional ainda não ocorreu.
- O build e os gates editoriais impedem corretamente a geração de rotas para os seis artigos.

## Riscos Por Artigo

### Entendendo a perda gestacional

- Validar definições, sinais de urgência e adequação ao contexto brasileiro.
- Avaliar acolhimento, culpa e linguagem sobre luto.
- Evitar que sintomas educativos sejam interpretados como diagnóstico.

### Gestação após perda

- Validar limites do planejamento pré-concepcional e do acompanhamento.
- Revisar linguagem sobre ansiedade, culpa e rede de apoio.
- Evitar que perguntas organizacionais sejam interpretadas como intervenções universais.

### Investigação após perdas recorrentes

- Validar divergências entre ESHRE, RCOG e ACOG.
- Revisar comunicação sobre casos sem causa identificada.
- Evitar que áreas de investigação sejam interpretadas como lista automática de exames.

### Trombofilias hereditárias e adquiridas

- Validar classificações, comunicação de risco e limites da investigação.
- Evitar equiparar marcadores diferentes ou induzir rastreamento amplo.

### Síndrome Antifosfolípide

- Validar critérios, persistência laboratorial e comunicação de risco.
- Evitar autodiagnóstico baseado em resultado isolado.

### MTHFR: evidências, incertezas e divergências

- Validar a síntese das recomendações de genética, hematologia e medicina materno-fetal.
- Preservar a distinção entre alegações públicas e recomendações de diretrizes.

## Bloqueios Atuais

- nenhum revisor clínico ou psicológico profissional está cadastrado;
- não existem registros `domain_review`;
- não existe aprovação editorial independente válida;
- não existe transição de `in_review` para `approved`;
- a quantidade mínima de seis artigos aprovados não foi atingida;
- glossário e busca permanecem bloqueados;
- a rota pública de artigo verificada retorna `404`.

## Próximo Passo Seguro

Manter os seis artigos em `in_review` e sem rotas públicas. Codex e mantenedor podem repetir
auditorias técnicas, atualizar fontes e preparar pacotes de revisão, mas não podem registrar
aprovação profissional nem concluir o marco de publicação.
