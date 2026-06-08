# Política de Referências

## Base central

As fontes reutilizáveis ficam em `src/content/references`. Cada registro declara URL, publicador,
tipo, domínio, autoridade, usos permitidos, usos proibidos, limitações e data da última verificação.

`npm run editorial:references:sync` centraliza fontes inline ainda não registradas. A classificação
gerada é inicial e deve ser revisada antes da publicação.

## Autoridade

- `high`: leis, governos, diretrizes e documentos oficiais de sociedades profissionais.
- `medium`: materiais institucionais e revisões úteis que exigem contextualização.
- `low`: blogs, redes sociais e materiais sem autoridade adequada para sustentar afirmações clínicas.

Blogs e redes sociais podem inspirar linguagem ou acolhimento, mas nunca sustentam sozinhos uma
afirmação clínica ou jurídica.

## Gates

Toda fonte declarada em conteúdo deve existir na base central. Conteúdo aprovado não pode depender
de fonte classificada como `low`. A presença de uma fonte não transforma uma afirmação em correta
nem constitui revisão profissional ou autorização para reprodução extensa.
