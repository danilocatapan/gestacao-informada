# Relatorio de prontidao dos artigos do MVP

Data da auditoria Codex: 2026-06-08

## Resultado

Os seis artigos prioritarios foram pesquisados, redigidos e auditados com assistencia de IA. Todos permanecem em `draft` e bloqueados para publicacao porque ainda nao existem revisores profissionais cadastrados, registros de revisao por dominio nem aprovacao editorial independente.

A auditoria Codex verifica estrutura, fontes, riscos e linguagem, mas nao concede aprovacao profissional.

## Inventario

| Artigo | Papel no MVP | Dominios | Fontes | Inspiracao externa | Estado | Resultado |
|---|---|---|---:|---|---|---|
| `entendendo-a-perda-gestacional` | Prioritario | clinical, psychological | 3 | Nao | draft | Bloqueado |
| `gestacao-apos-perda` | Prioritario | clinical, psychological | 3 | Nao | draft | Bloqueado |
| `investigacao-apos-perdas-recorrentes` | Prioritario | clinical, psychological | 3 | Nao | draft | Bloqueado |
| `trombofilias-hereditarias-e-adquiridas` | Prioritario | clinical | 3 | Dr. Rodrigo Berger | draft | Bloqueado |
| `sindrome-antifosfolipide` | Prioritario | clinical | 3 | Dr. Rodrigo Berger | draft | Bloqueado |
| `mthfr-evidencias-e-incertezas` | Prioritario | clinical | 4 | Site do Dr. Rodrigo Berger | draft | Bloqueado |
| `rascunho-principios-editoriais` | Fixture tecnico | clinical | 0 | Nao | draft | Excluido da meta |

## Bloqueios comuns

- nenhum revisor clinico ou psicologico profissional esta cadastrado;
- nao existem registros em `editorial-records`;
- nao houve submissao formal para revisao;
- nao houve revisao aprovada para cada dominio declarado;
- nao houve aprovacao editorial independente;
- nao houve transicao valida de `in_review` para `approved`;
- as fontes e matrizes de afirmacoes ainda precisam de validacao profissional.

## Pacotes de revisao humana

### Entendendo a perda gestacional

- Revisao clinica: confirmar definicoes, sinais de urgencia e adequacao ao contexto brasileiro.
- Revisao psicologica: avaliar acolhimento, culpa e linguagem sobre luto.
- Risco principal: sintomas podem ser interpretados como diagnostico sem contexto.

### Gestacao apos perda

- Revisao clinica: validar limites do planejamento pre-concepcional e do acompanhamento.
- Revisao psicologica: revisar linguagem sobre ansiedade, culpa e rede de apoio.
- Risco principal: perguntas organizacionais serem interpretadas como necessidade universal de intervencao.

### Investigacao apos perdas recorrentes

- Revisao clinica: validar divergencias entre ESHRE, RCOG e ACOG.
- Revisao psicologica: revisar comunicacao sobre casos sem causa identificada.
- Risco principal: transformar areas de investigacao em lista automatica de exames.

### Trombofilias hereditarias e adquiridas

- Revisao clinica: hematologia e obstetricia devem validar classificacoes, risco e limites da investigacao.
- Risco principal: equiparar marcadores diferentes ou induzir rastreamento amplo.
- Inspiracao: posts publicos do Dr. Rodrigo Berger, usados apenas para identificar duvidas.

### Sindrome Antifosfolipide

- Revisao clinica: validar criterios, persistencia laboratorial e comunicacao de risco.
- Risco principal: autodiagnostico com base em resultado isolado.
- Inspiracao: post publico do Dr. Rodrigo Berger sobre SAAF e placentacao.

### MTHFR: evidencias, incertezas e divergencias

- Revisao clinica: profissional com experiencia em genetica, hematologia ou medicina materno-fetal.
- Risco principal: conflito entre alegacoes publicas e recomendacoes de diretrizes.
- Inspiracao: site publico do Dr. Rodrigo Berger, usado para mapear a controversia.

## Fontes validadas editorialmente

Foram priorizadas diretrizes e materiais institucionais de ACOG, ASH, CDC, ESHRE, EULAR, Ministerio da Saude e RCOG. "Validada editorialmente" significa que a fonte e rastreavel e pertinente; nao significa que uma revisao profissional confirmou todas as interpretacoes.

## Termos sensiveis e riscos detectados

- Todos os seis artigos declaram `clinical` em `riskDomains`; tres tambem declaram `psychological`.
- Termos tematicos como perda gestacional, trombofilia, trombose, SAF/SAAF, MTHFR e exames aparecem em contexto educativo e exigem as revisoes profissionais declaradas.
- Os textos evitam doses, protocolos, promessas de desfecho e orientacoes para iniciar, suspender ou alterar medicamentos.
- Materiais externos que apresentam condutas ou alegacoes controversas foram registrados somente como inspiracao editorial e nao foram reproduzidos.
- Qualquer inclusao futura de termo medicamentoso, dose, prescricao ou promessa devera receber uma excecao documentada em `safetyReview` antes de se tornar publicavel.

## Proximos passos obrigatorios

1. Cadastrar revisores profissionais com credenciais verificaveis e papeis compativeis.
2. Realizar revisao por dominio usando as matrizes de afirmacoes.
3. Corrigir os artigos conforme as decisoes profissionais e atualizar `lastUpdatedAt`.
4. Registrar submissao, revisoes, aprovacao editorial e transicoes em `editorial-records`.
5. Executar a skill de auditoria editorial e todos os gates antes de qualquer publicacao.
