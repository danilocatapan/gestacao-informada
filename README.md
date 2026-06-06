# Gestacao Informada

Portal de informação responsável e acolhimento para famílias que atravessam perdas gestacionais.

## Estado atual

O primeiro MVP editorial usa Astro, TypeScript, geracao estatica, CSS proprio e conteudo Markdown versionado.
As paginas institucionais e o checklist nao clinico estao publicaveis; artigos medicos e documentos juridicos permanecem bloqueados ate revisao.

Rotas publicas do MVP tecnico:

- inicio, entender a perda, trombofilias, acolhimento e direitos;
- sobre o projeto;
- materiais para organizacao de consultas.

Busca, glossario clinico e expansao editorial ficam adiados ate existir conteudo aprovado e revisado em volume suficiente.

## Desenvolvimento

```bash
npm install
npm run dev
```

Verificacao completa:

```bash
npm test
npm run test:e2e
```

O site e preparado para publicacao em `https://danilocatapan.github.io/gestacao-informada/`.

## Documentação

- [Visão do produto](docs/PRODUCT.md)
- [Roadmap inicial](docs/ROADMAP.md)
- [Registro de decisões](docs/DECISIONS.md)
- [Como contribuir](CONTRIBUTING.md)

## Agentes e automações

As instruções para agentes estão em [AGENTS.md](AGENTS.md). A skill local do projeto está em `.codex/skills/gestacao-informada`.

## Princípio essencial

O conteúdo do portal é educativo e não substitui avaliação, diagnóstico ou tratamento individualizado. Todo conteúdo clínico deve indicar fontes, autoria e data de revisão, além de passar por revisão profissional antes da publicação.

## Conteudo

- `src/content/pages`: paginas institucionais.
- `src/content/articles`: artigos medicos sujeitos ao gate editorial.
- `src/content/legal`: documentos juridicos nao publicaveis sem aprovacao.
- `src/content/review-notes`: notas internas sem rotas.
- `src/content/contributors`: perfis referenciados de autores e revisores.
- `tests/smoke.spec.ts`: smoke tests das rotas publicas em desktop e mobile.
