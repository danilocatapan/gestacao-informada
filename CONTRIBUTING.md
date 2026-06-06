# Como contribuir

## Antes de comecar

1. Leia `AGENTS.md` e `docs/PRODUCT.md`.
2. Verifique prioridades e dependencias em `docs/ROADMAP.md`.
3. Registre decisoes estruturais em `docs/DECISIONS.md`.

## Mudancas

- Mantenha cada alteracao focada em um objetivo.
- Explique motivacao, impacto e como a mudanca foi verificada.
- Nao inclua dados pessoais, informacoes clinicas identificaveis ou segredos.
- Conteudo de saude somente pode ser publicado depois da revisao profissional definida pelo projeto.
- Use os helpers de URL do projeto e nao concatene o caminho-base do GitHub Pages.
- Nao adicione frameworks de componentes sem uma decisao registrada.

## Verificacao

Antes de abrir um pull request:

```text
npm run lint
npm run check
npm run test:content
npm run build
npm run test:build
npm run test:e2e
```

O hook de pre-commit executa `test:content`. O CI continua sendo o gate obrigatorio para merge e deploy.

## Commits

Use mensagens curtas e descritivas, preferencialmente no formato:

```text
tipo: descricao objetiva
```

Exemplos: `docs: define principios editoriais` e `feat: adiciona pagina inicial`.
