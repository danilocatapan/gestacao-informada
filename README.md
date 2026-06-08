# Gestação Informada

Portal de informação responsável e acolhimento para famílias que atravessam perdas gestacionais.

## Estado atual

O primeiro MVP editorial usa Astro, TypeScript, geração estática, CSS próprio e conteúdo Markdown versionado.
As páginas institucionais e o checklist não clínico estão publicáveis. Os seis artigos prioritários
estão preparados e em `in_review`, mas nenhum possui aprovação profissional ou rota pública.
Documentos jurídicos também permanecem bloqueados até revisão.

Rotas públicas do MVP técnico:

- início, entender a perda, trombofilias, acolhimento e direitos;
- sobre o projeto;
- materiais para organização de consultas.

A infraestrutura de busca e glossário clínico está implementada, mas sua publicação permanece
bloqueada: existem zero artigos e zero termos clínicos aprovados.

## Desenvolvimento

```bash
npm install
npm run dev
```

Verificação completa:

```bash
npm test
npm run test:e2e
```

O site é preparado para publicação em `https://danilocatapan.github.io/gestacao-informada/`.

## Documentação

- [Visão do produto](docs/PRODUCT.md)
- [Roadmap inicial](docs/ROADMAP.md)
- [Registro de decisões](docs/DECISIONS.md)
- [Fluxo editorial seguro](docs/EDITORIAL_WORKFLOW.md)
- [Como contribuir](CONTRIBUTING.md)

## Agentes e automações

As instruções para agentes estão em [AGENTS.md](AGENTS.md). A skill geral do projeto está em `.codex/skills/gestacao-informada` e a auditoria fail-closed em `.codex/skills/auditar-publicacao-editorial`.

Toda entrega deve reconciliar implementação, roadmap, documentação e contratos de agentes,
atualizando somente os artefatos realmente impactados.

Pipeline e painel editorial local:

```bash
npm run editorial:review -- articles/entendendo-a-perda-gestacional
npm run editorial:review:mvp
npm run editorial:panel
```

O painel abre somente em `127.0.0.1` e separa a triagem automatizada das decisões humanas.
Automações podem resolver apontamentos e enviar conteúdo para `in_review`. Revisores humanos
identificados podem registrar pessoalmente revisões profissionais, exceções de segurança e
aprovação editorial. A transição local para `approved` somente ocorre quando todos os gates passam.
Nenhuma ação do painel cria commit, executa push ou faz deploy.

## Princípio essencial

O conteúdo do portal é educativo e não substitui avaliação, diagnóstico ou tratamento individualizado. Todo conteúdo clínico deve indicar fontes, autoria e data de revisão, além de passar por revisão profissional antes da publicação.

## Conteúdo

- `src/content/pages`: páginas institucionais.
- `src/content/articles`: artigos médicos sujeitos ao gate editorial.
- `src/content/legal`: documentos jurídicos não publicáveis sem aprovação.
- `src/content/review-notes`: notas internas sem rotas.
- `src/content/editorial-records`: trilha auditável de revisões, aprovações e transições.
- `src/content/contributors`: perfis referenciados de autores e revisores.
- `src/content/references`: base central de fontes, autoridade e limitações.
- `docs/editorial-reviews`: pareceres automatizados e decisões tomadas no painel local.
- `tests/smoke.spec.ts`: smoke tests das rotas públicas em desktop e mobile.
