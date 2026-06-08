# Como contribuir

## Antes de começar

1. Leia `AGENTS.md` e `docs/PRODUCT.md`.
2. Verifique prioridades e dependências em `docs/ROADMAP.md`.
3. Registre decisões estruturais em `docs/DECISIONS.md`.
4. Para qualquer mudança publicável, siga `docs/EDITORIAL_WORKFLOW.md`.
5. Antes de concluir, reconcilie implementação, roadmap, documentos afetados, agentes e skills locais.

## Mudanças

- Mantenha cada alteração focada em um objetivo.
- Explique motivação, impacto e como a mudança foi verificada.
- Não inclua dados pessoais, informações clínicas identificáveis ou segredos.
- Conteúdo de saúde somente pode ser publicado depois da revisão profissional definida pelo projeto.
- Conteúdo sensível deve declarar domínios de risco e possuir registros atuais para todas as revisões exigidas.
- Autor, revisores profissionais e aprovador editorial devem ser participantes distintos.
- Use os helpers de URL do projeto e não concatene o caminho-base do GitHub Pages.
- Não adicione frameworks de componentes sem uma decisão registrada.
- Atualize `docs/ROADMAP.md` quando progresso, bloqueios, escopo ou dependências mudarem.
- Revise `.agents/` e skills locais quando responsabilidades, interfaces, limites ou fluxos mudarem.
- Não altere documentação ou contratos de agentes artificialmente quando não houver impacto real.
- Diferencie infraestrutura implementada, conteúdo preparado, publicação bloqueada e entrega pública.
- Mantenha a documentação em português do Brasil com ortografia e acentuação corretas.

## Verificação

Antes de abrir um pull request:

```text
npm run lint
npm run check
npm run test:content
npm run build
npm run test:build
npm run test:e2e
```

O hook de pre-commit executa `test:content`. O CI continua sendo o gate obrigatório para merge e deploy.

Ao concluir, informe quais documentos e contratos de agentes foram revisados, quais foram alterados,
quais divergências foram corrigidas e quais atualizações foram consideradas desnecessárias.

## Commits

Use mensagens curtas e descritivas, preferencialmente no formato:

```text
tipo: descrição objetiva
```

Exemplos: `docs: define princípios editoriais` e `feat: adiciona página inicial`.
