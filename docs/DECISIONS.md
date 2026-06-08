# Registro de Decisoes

Este arquivo registra decisoes que afetam a direcao do produto ou sua arquitetura.

## 2026-06-06 — Repositorio inicial sem stack definida

**Status:** aceita

**Decisao:** iniciar o repositorio com documentacao, instrucoes para agentes e governanca minima, sem escolher framework ou implementar a interface.

**Motivo:** preservar liberdade para validar escopo, revisores e requisitos antes de assumir custos tecnicos.

## 2026-06-06 — Conteudo clinico exige revisao profissional

**Status:** aceita

**Decisao:** nenhum conteudo clinico sera considerado publicavel sem fonte, autoria, data de revisao e aprovacao profissional.

**Motivo:** o portal aborda temas de saude com potencial de influenciar decisoes de alto risco.

## 2026-06-06 — Astro estatico como stack do MVP

**Status:** aceita

**Decisao:** usar Astro na major estavel definida no `package.json`, TypeScript, geracao estatica e CSS proprio. Frameworks de componentes nao serao instalados por padrao; islands futuras exigem necessidade real e decisao registrada.

**Motivo:** o MVP e editorial e prioriza desempenho, SEO, acessibilidade e minimo JavaScript.

## 2026-06-06 — Conteudo versionado e collections separadas

**Status:** aceita

**Decisao:** usar Markdown versionado como CMS do MVP, separado em collections para paginas institucionais, artigos medicos, documentos legais, notas de revisao e contribuidores. Autoria e revisao usam referencias tipadas.

**Motivo:** manter rastreabilidade e bloquear publicacao incompleta. Um CMS visual fica adiado ate existir fluxo editorial com revisores; Decap, Sanity, Storyblok, Contentful e Strapi permanecem alternativas futuras.

## 2026-06-06 — Gate editorial de termos sensiveis

**Status:** aceita

**Decisao:** conteudo publicavel com termos sensiveis deve possuir excecao tipada em `safetyReview`. O pre-commit executa a verificacao local e o CI e o gate obrigatorio para merge e deploy.

**Motivo:** termos podem ser necessarios em contexto educativo, mas exigem justificativa e revisao documentadas.

## 2026-06-06 — URLs e hospedagem temporaria

**Status:** aceita

**Decisao:** publicar temporariamente no GitHub Pages com base `/gestacao-informada`, trailing slash obrigatoria e helpers centralizados para URLs relativas e canonicas.

**Motivo:** impedir links quebrados sob subdiretorio e manter SEO consistente durante o MVP.

## 2026-06-06 — Paginas legais e identidade provisoria

**Status:** aceita

**Decisao:** manter privacidade, termos e politica editorial como placeholders internos sem rotas ate aprovacao juridica. Versionar as pranchas de identidade e usar ativos rasterizados derivados provisoriamente.

**Motivo:** nao publicar texto juridico sem revisao e permitir que o MVP aplique a identidade enquanto os arquivos vetoriais finais nao existem.

## 2026-06-06 — Fechamento do MVP tecnico separado da expansao editorial

**Status:** aceita

**Decisao:** considerar o MVP tecnico concluido com governanca editorial, rotas institucionais, materiais nao clinicos, drafts bloqueados, CI e deploy funcional. Busca, glossario clinico e publicacao de artigos permanecem adiados ate existir volume e revisao profissional.

**Motivo:** evitar que dependencias externas de revisao atrasem a entrega tecnica e impedir a publicacao prematura de conteudo clinico.

## 2026-06-06 — Metadados de tipo e natureza clinica

**Status:** aceita

**Decisao:** todo conteudo publicavel declara `contentType` e `clinical`. Conteudo clinico aprovado reside na collection `articles` e exige autoria, revisao, fontes, disclaimer e datas; checklists organizacionais podem ser publicados com `clinical: false`.

**Motivo:** diferenciar formato editorial de risco clinico e aplicar requisitos proporcionais sem enfraquecer os gates de seguranca.

## 2026-06-07 — Governanca editorial por dominio e trilha auditavel

**Status:** aceita

**Decisao:** classificar conteudos pelos dominios `clinical`, `psychological` e `legal`; exigir revisoes humanas compativeis, aprovacao editorial independente e registros versionados antes de publicar conteudo governado. O agente Codex atua somente como auditor fail-closed e nunca concede aprovacao ou altera status.

**Motivo:** impedir publicacao baseada em campos isolados, revisoes obsoletas ou automacao sem autoridade profissional, preservando rastreabilidade e separacao de responsabilidades.

## 2026-06-08 — Fluxo tecnico e URLs das paginas legais

**Status:** aceita

**Decisao:** usar `in_review` como estado canonico equivalente a uma pendencia em revisao, manter documentos legais sem slug ou rota enquanto nao aprovados e reservar as URLs publicas `/privacidade/`, `/termos/` e `/politica-editorial/`. A publicacao exige metadados de revisao juridica coerentes com a trilha em `editorial-records`.

**Motivo:** evitar estados editoriais duplicados, bloquear exposicao prematura e manter URLs institucionais curtas sem enfraquecer os gates auditaveis.

## 2026-06-08 — Direcao tipografica editorial e candidatos vetoriais

**Status:** aceita

**Decisao:** manter Georgia nos titulos como escolha editorial deliberada e Poppins nos demais textos. Reconstrucoes SVG derivadas dos PNGs provisórios permanecem apenas como candidatos documentados e nao substituem ativos publicos sem aprovacao formal.

**Motivo:** preservar a hierarquia editorial acolhedora do MVP e impedir que ativos reconstruidos sem os arquivos-fonte sejam apresentados como identidade aprovada.

## 2026-06-08 — Assistencia por IA e creditos de inspiracao editorial

**Status:** aceita

**Decisao:** registrar a assistencia do Codex em pesquisa de pauta, triagem de fontes, redacao e auditoria de seguranca por metadados tipados e aviso publico. A assistencia por IA e uma etapa obrigatoria de preparacao dos artigos do MVP, mas nunca concede aprovacao clinica, psicologica, juridica ou editorial e nao substitui revisao profissional humana. Materiais publicos externos podem receber credito como inspiracao editorial, em campo separado das fontes clinicas, sem implicar parceria, revisao ou endosso.

**Motivo:** tornar transparente o uso de automacao sem enfraquecer a governanca fail-closed, preservar a distincao entre descoberta de pautas e evidencia clinica e evitar apropriacao indevida de conteudo de terceiros.

## 2026-06-08 — Guias juridicos acolhedores em rota dedicada

**Status:** aceita

**Decisao:** tratar guias juridico-informativos como conteudo legal governado, com autoria, fontes oficiais, disclaimer, revisao juridica humana e trilha editorial antes da publicacao. A linguagem acolhedora e requisito obrigatorio tambem para conteudo juridico, sem reduzir a precisao, criar garantias ou substituir orientacao individual. O guia sobre direitos ocupa a rota dedicada `/direitos/` somente quando aprovado; enquanto estiver bloqueado, a rota preserva a apresentacao institucional.

**Motivo:** oferecer informacao util em um momento de vulnerabilidade sem expor familias a aconselhamento juridico impreciso ou publicar conteudo ainda nao revisado.
