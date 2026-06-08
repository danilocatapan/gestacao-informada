# Gestação Informada

Portal brasileiro de informação responsável e acolhimento para famílias afetadas por perda gestacional.

## Estado atual

O MVP técnico está funcional. Os seis artigos iniciais possuem parecer editorial v2, zero hard blockers, decisão `approved_for_publication` e rotas públicas confirmadas no GitHub Pages.

## Desenvolvimento

```bash
npm install
npm run dev
npm test
```

Pipeline e painel editorial:

```bash
npm run editorial:review -- articles/identificador
npm run editorial:review:mvp
npm run editorial:panel
npm run test:e2e:editorial
```

O parecer v2 pode resultar em:

- `blocked`: bloqueio objetivo sem override;
- `owner_review_required`: escalada que exige um único OK do mantenedor;
- `approved_for_publication`: conteúdo tecnicamente apto para publicação.

Conteúdo limpo pode ir diretamente para `approved`. O painel registra correções e o OK, mas não faz commit, push ou deploy. A publicação ocorre por PR, CI e GitHub Pages.

## Política editorial

Os artigos são sínteses originais rastreáveis baseadas nas fontes declaradas. Referência não autoriza reprodução ou adaptação extensa. Conteúdo governado declara publicamente assistência de IA, ausência de revisão profissional e seus limites educativos.

## Estrutura

- `src/content/articles`: artigos médicos;
- `src/content/glossary`: termos clínicos;
- `src/content/legal`: documentos e guias jurídicos;
- `src/content/references`: base central de fontes;
- `docs/editorial-reviews`: pareceres editoriais v2;
- `.agents`: contratos dos agentes especialistas.
