# Relatório de prontidão dos artigos do MVP

Data da auditoria Codex: 2026-06-08

## Resultado

Os seis artigos prioritários foram pesquisados, redigidos e auditados com assistência de IA. Todos permanecem em `draft` e bloqueados para publicação porque ainda não existem revisores profissionais cadastrados, registros de revisão por domínio nem aprovação editorial independente.

A auditoria Codex verifica estrutura, fontes, riscos e linguagem, mas não concede aprovação profissional.

## Inventário

| Artigo | Papel no MVP | Domínios | Fontes | Inspiração externa | Estado | Resultado |
|---|---|---|---:|---|---|---|
| `entendendo-a-perda-gestacional` | Prioritário | clinical, psychological | 3 | Não | draft | Bloqueado |
| `gestacao-apos-perda` | Prioritário | clinical, psychological | 3 | Não | draft | Bloqueado |
| `investigacao-apos-perdas-recorrentes` | Prioritário | clinical, psychological | 3 | Não | draft | Bloqueado |
| `trombofilias-hereditarias-e-adquiridas` | Prioritário | clinical | 3 | Dr. Rodrigo Berger | draft | Bloqueado |
| `sindrome-antifosfolipide` | Prioritário | clinical | 3 | Dr. Rodrigo Berger | draft | Bloqueado |
| `mthfr-evidencias-e-incertezas` | Prioritário | clinical | 4 | Site do Dr. Rodrigo Berger | draft | Bloqueado |
| `rascunho-principios-editoriais` | Fixture técnico | clinical | 0 | Não | draft | Excluído da meta |

## Bloqueios comuns

- nenhum revisor clínico ou psicológico profissional está cadastrado;
- não existem registros em `editorial-records`;
- não houve submissão formal para revisão;
- não houve revisão aprovada para cada domínio declarado;
- não houve aprovação editorial independente;
- não houve transição válida de `in_review` para `approved`;
- as fontes e matrizes de afirmações ainda precisam de validação profissional.

## Pacotes de revisão humana

### Entendendo a perda gestacional

- Revisão clínica: confirmar definições, sinais de urgência e adequação ao contexto brasileiro.
- Revisão psicológica: avaliar acolhimento, culpa e linguagem sobre luto.
- Risco principal: sintomas podem ser interpretados como diagnóstico sem contexto.

### Gestação após perda

- Revisão clínica: validar limites do planejamento pré-concepcional e do acompanhamento.
- Revisão psicológica: revisar linguagem sobre ansiedade, culpa e rede de apoio.
- Risco principal: perguntas organizacionais serem interpretadas como necessidade universal de intervenção.

### Investigação após perdas recorrentes

- Revisão clínica: validar divergências entre ESHRE, RCOG e ACOG.
- Revisão psicológica: revisar comunicação sobre casos sem causa identificada.
- Risco principal: transformar áreas de investigação em lista automática de exames.

### Trombofilias hereditárias e adquiridas

- Revisão clínica: hematologia e obstetrícia devem validar classificações, risco e limites da investigação.
- Risco principal: equiparar marcadores diferentes ou induzir rastreamento amplo.
- Inspiração: posts públicos do Dr. Rodrigo Berger, usados apenas para identificar dúvidas.

### Síndrome Antifosfolípide

- Revisão clínica: validar critérios, persistência laboratorial e comunicação de risco.
- Risco principal: autodiagnóstico com base em resultado isolado.
- Inspiração: post público do Dr. Rodrigo Berger sobre SAAF e placentação.

### MTHFR: evidências, incertezas e divergências

- Revisão clínica: profissional com experiência em genética, hematologia ou medicina materno-fetal.
- Risco principal: conflito entre alegações públicas e recomendações de diretrizes.
- Inspiração: site público do Dr. Rodrigo Berger, usado para mapear a controvérsia.

## Fontes validadas editorialmente

Foram priorizadas diretrizes e materiais institucionais de ACOG, ASH, CDC, ESHRE, EULAR, Ministério da Saúde e RCOG. “Validada editorialmente” significa que a fonte é rastreável e pertinente; não significa que uma revisão profissional confirmou todas as interpretações.

## Termos sensíveis e riscos detectados

- Todos os seis artigos declaram `clinical` em `riskDomains`; três também declaram `psychological`.
- Termos temáticos como perda gestacional, trombofilia, trombose, SAF/SAAF, MTHFR e exames aparecem em contexto educativo e exigem as revisões profissionais declaradas.
- Os textos evitam doses, protocolos, promessas de desfecho e orientações para iniciar, suspender ou alterar medicamentos.
- Materiais externos que apresentam condutas ou alegações controversas foram registrados somente como inspiração editorial e não foram reproduzidos.
- Qualquer inclusão futura de termo medicamentoso, dose, prescrição ou promessa deverá receber uma exceção documentada em `safetyReview` antes de se tornar publicável.

## Próximos passos obrigatórios

1. Cadastrar revisores profissionais com credenciais verificáveis e papéis compatíveis.
2. Realizar revisão por domínio usando as matrizes de afirmações.
3. Corrigir os artigos conforme as decisões profissionais e atualizar `lastUpdatedAt`.
4. Registrar submissão, revisões, aprovação editorial e transições em `editorial-records`.
5. Executar a skill de auditoria editorial e todos os gates antes de qualquer publicação.
