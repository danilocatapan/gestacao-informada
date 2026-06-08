# Política de Revisão Assistida por IA

## Objetivo

A IA reduz o trabalho de pesquisa, triagem, contraponto e preparação editorial. Ela opera de forma
fail-closed e não substitui médicos, psicólogos, advogados ou aprovadores editoriais humanos.

## Autoridade

Os agentes podem produzir pareceres `ready_for_human_review`, `needs_changes` ou `blocked`.
Nenhum parecer automatizado concede aprovação profissional, promove conteúdo para `approved`,
cria commit, executa push ou publica o site.

Conteúdo clínico, psicológico ou jurídico somente pode ser publicado após os registros humanos
exigidos em `docs/EDITORIAL_WORKFLOW.md`.

## Painel local

O painel iniciado por `npm run editorial:panel` escuta exclusivamente em `127.0.0.1`. Ele apresenta
apontamentos no contexto do artigo e permite aceitar, ajustar ou rejeitar sugestões com justificativa.

A ação final aplica somente mudanças aceitas e envia conteúdo elegível para `in_review`. Se um
conteúdo `approved` for alterado, ele retorna para `draft` e perde a rota pública até uma nova rodada
completa de revisão.

## Rastreabilidade

Pareceres ficam em `docs/editorial-reviews`. Cada parecer contém o hash da versão analisada,
apontamentos, decisões e histórico. Uma mudança posterior no arquivo invalida a aplicação do parecer.

O painel não registra decisões clínicas, psicológicas ou jurídicas em nome de profissionais.
