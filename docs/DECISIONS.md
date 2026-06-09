# Registro de Decisoes

Este arquivo registra decisoes que afetam a direcao do produto ou sua arquitetura.

## 2026-06-09 — Navegação por necessidades e busca independente do glossário

**Status:** aceita; substitui parcialmente a decisão “Glossário clínico e busca condicionados a conteúdo aprovado”.

**Decisão:** limitar a navegação principal a `Entender`, `Acolhimento`, `Organizar` e `Buscar`. Artigos, investigação, direitos e informações institucionais permanecem acessíveis nos contextos relevantes e no rodapé. A busca estática pode ser publicada independentemente do glossário, mas indexa somente rotas efetivamente públicas e conteúdo `approved`. O glossário mantém o marco de seis artigos e seis termos aprovados.

**Motivo:** reduzir carga cognitiva para pessoas em situação de vulnerabilidade, tornar os artigos já publicados encontráveis e evitar que a ausência de termos do glossário bloqueie a descoberta de conteúdo público seguro.

## 2026-06-08 — Fluxo editorial v2 simplificado

**Status:** aceita; substitui as decisões anteriores que exigiam revisão profissional, participantes distintos, registros em `editorial-records` e aprovação multidomínio.

**Decisão:** o Codex orquestra agentes especialistas e registra um parecer editorial v2. Bloqueios objetivos não aceitam override; decisões subjetivas ou sensíveis exigem um único OK do mantenedor vinculado ao hash. Conteúdo limpo pode ser promovido tecnicamente para `approved`. O painel permanece local e a publicação ocorre por PR, CI e GitHub Pages.

**Motivo:** manter fontes, segurança, rastreabilidade e transparência sem depender de revisores profissionais indisponíveis nem sustentar cadastros e cerimônias que impediam a publicação.

## 2026-06-08 — Síntese original rastreável e transparência

**Status:** aceita.

**Decisão:** artigos devem ser sínteses originais baseadas em fontes rastreáveis. Referenciar uma obra não autoriza reprodução ou adaptação extensa. Todo conteúdo governado publicado declara assistência de IA, ausência de revisão profissional e limites educativos.

**Motivo:** reduzir risco autoral, clínico e reputacional sem ocultar a governança real do portal.

## 2026-06-06 — Repositorio inicial sem stack definida

**Status:** aceita

**Decisão:** iniciar o repositório com documentação, instruções para agentes e governança mínima, sem escolher framework ou implementar a interface.

**Motivo:** preservar liberdade para validar escopo, revisores e requisitos antes de assumir custos tecnicos.

## 2026-06-06 — Conteúdo clínico exige revisão profissional

**Status:** aceita

**Decisão:** nenhum conteúdo clínico será considerado publicável sem fonte, autoria, data de revisão e aprovação profissional.

**Motivo:** o portal aborda temas de saude com potencial de influenciar decisoes de alto risco.

## 2026-06-06 — Astro estatico como stack do MVP

**Status:** aceita

**Decisão:** usar Astro na major estável definida no `package.json`, TypeScript, geração estática e CSS próprio. Frameworks de componentes não serao instalados por padrão; islands futuras exigem necessidade real e decisão registrada.

**Motivo:** o MVP e editorial e prioriza desempenho, SEO, acessibilidade e minimo JavaScript.

## 2026-06-06 — Conteúdo versionado e collections separadas

**Status:** aceita

**Decisão:** usar Markdown versionado como CMS do MVP, separado em collections para páginas institucionais, artigos médicos, documentos legais, notas de revisão e contribuidores. Autoria e revisão usam referências tipadas.

**Motivo:** manter rastreabilidade e bloquear publicação incompleta. Um CMS visual fica adiado até existir fluxo editorial com revisores; Decap, Sanity, Storyblok, Contentful e Strapi permanecem alternativas futuras.

## 2026-06-06 — Gate editorial de termos sensíveis

**Status:** aceita

**Decisão:** conteúdo publicável com termos sensíveis deve possuir exceção tipada em `safetyReview`. O pre-commit executa a verificação local e o CI e o gate obrigatório para merge e deploy.

**Motivo:** termos podem ser necessários em contexto educativo, mas exigem justificativa e revisão documentadas.

## 2026-06-06 — URLs e hospedagem temporaria

**Status:** aceita

**Decisão:** publicar temporariamente no GitHub Pages com base `/gestacao-informada`, trailing slash obrigatória e helpers centralizados para URLs relativas e canônicas.

**Motivo:** impedir links quebrados sob subdiretorio e manter SEO consistente durante o MVP.

## 2026-06-06 — Páginas legais e identidade provisória

**Status:** aceita

**Decisão:** manter privacidade, termos e política editorial como placeholders internos sem rotas até aprovação jurídica. Versionar as pranchas de identidade e usar ativos rasterizados derivados provisoriamente.

**Motivo:** não publicar texto jurídico sem revisão e permitir que o MVP aplique a identidade enquanto os arquivos vetoriais finais não existem.

## 2026-06-06 — Fechamento do MVP técnico separado da expansao editorial

**Status:** aceita

**Decisão:** considerar o MVP técnico concluído com governança editorial, rotas institucionais, materiais não clínicos, drafts bloqueados, CI e deploy funcional. Busca, glossário clínico e publicação de artigos permanecem adiados até existir volume e revisão profissional.

**Motivo:** evitar que dependências externas de revisão atrasem a entrega técnica e impedir a publicação prematura de conteúdo clínico.

## 2026-06-06 — Metadados de tipo e natureza clínica

**Status:** aceita

**Decisão:** todo conteúdo publicável declara `contentType` e `clinical`. Conteúdo clínico aprovado reside na collection `articles` e exige autoria, revisão, fontes, disclaimer e datas; checklists organizacionais podem ser publicados com `clinical: false`.

**Motivo:** diferenciar formato editorial de risco clínico e aplicar requisitos proporcionais sem enfraquecer os gates de segurança.

## 2026-06-07 — Governanca editorial por domínio e trilha auditável

**Status:** aceita

**Decisão:** classificar conteúdos pelos domínios `clinical`, `psychological` e `legal`; exigir revisões humanas compatíveis, aprovação editorial independente e registros versionados antes de publicar conteúdo governado. O agente Codex atua somente como auditor fail-closed e nunca concede aprovação ou altera status.

**Motivo:** impedir publicação baseada em campos isolados, revisões obsoletas ou automação sem autoridade profissional, preservando rastreabilidade e separacao de responsabilidades.

## 2026-06-08 — Fluxo técnico e URLs das páginas legais

**Status:** aceita

**Decisão:** usar `in_review` como estado canônico equivalente a uma pendência em revisão, manter documentos legais sem slug ou rota enquanto não aprovados e reservar as URLs públicas `/privacidade/`, `/termos/` e `/politica-editorial/`. A publicação exige metadados de revisão jurídica coerentes com a trilha em `editorial-records`.

**Motivo:** evitar estados editoriais duplicados, bloquear exposicao prematura e manter URLs institucionais curtas sem enfraquecer os gates auditaveis.

## 2026-06-08 — Direcao tipografica editorial e candidatos vetoriais

**Status:** aceita

**Decisão:** manter Georgia nos títulos como escolha editorial deliberada e Poppins nos demais textos. Reconstruções SVG derivadas dos PNGs provisórios permanecem apenas como candidatos documentados e não substituem ativos públicos sem aprovação formal.

**Motivo:** preservar a hierarquia editorial acolhedora do MVP e impedir que ativos reconstruidos sem os arquivos-fonte sejam apresentados como identidade aprovada.

## 2026-06-08 — Assistencia por IA e creditos de inspiração editorial

**Status:** aceita

**Decisão:** registrar a assistência do Codex em pesquisa de pauta, triagem de fontes, redação e auditoria de segurança por metadados tipados e aviso público. A assistência por IA é uma etapa obrigatória de preparação dos artigos do MVP, mas nunca concede aprovação clínica, psicológica, jurídica ou editorial e não substitui revisão profissional humana. Materiais públicos externos podem receber crédito como inspiração editorial, em campo separado das fontes clínicas, sem implicar parceria, revisão ou endosso.

**Motivo:** tornar transparente o uso de automação sem enfraquecer a governança fail-closed, preservar a distinção entre descoberta de pautas e evidência clínica e evitar apropriação indevida de conteúdo de terceiros.

## 2026-06-08 — Guias juridicos acolhedores em rota dedicada

**Status:** aceita

**Decisão:** tratar guias jurídico-informativos como conteúdo legal governado, com autoria, fontes oficiais, disclaimer, revisão jurídica humana e trilha editorial antes da publicação. A linguagem acolhedora e requisito obrigatório também para conteúdo jurídico, sem reduzir a precisao, criar garantias ou substituir orientação individual. O guia sobre direitos ocupa a rota dedicada `/direitos/` somente quando aprovado; enquanto estiver bloqueado, a rota preserva a apresentacao institucional.

**Motivo:** oferecer informação útil em um momento de vulnerabilidade sem expor famílias a aconselhamento jurídico impreciso ou publicar conteúdo ainda não revisado.

## 2026-06-08 — Glossário clínico e busca condicionados a conteúdo aprovado

**Status:** aceita

**Decisão:** permitir conteúdo clínico nas collections `articles` e `glossary`, ambas sujeitas ao gate editorial completo e à trilha auditável. Publicar glossário e busca estática somente quando existirem ao menos seis artigos e seis termos de glossário aprovados. A busca indexa exclusivamente conteúdo público `approved`.

**Motivo:** ampliar a compreensão sem criar uma via paralela de publicação clínica nem expor rascunhos, registros internos ou conteúdo ainda sem revisão profissional.

## 2026-06-08 — Pipeline assistida e painel editorial exclusivamente local

**Status:** parcialmente substituída pela decisão “Decisões humanas auditáveis no painel local”

**Decisão:** usar agentes especializados e uma pipeline determinística para pesquisa, contraponto,
edição e parecer multidomínio. Os pareceres automatizados podem bloquear ou declarar conteúdo apto
para avaliação humana, mas nunca concedem aprovação profissional. Um painel servido exclusivamente
em `127.0.0.1` permite resolver apontamentos e enviar conteúdo para `in_review`, sem commit, push
ou deploy. A automação não promove conteúdo para `approved`; a aplicação local de decisões humanas
válidas foi incorporada posteriormente.

**Motivo:** reduzir o trabalho manual do mantenedor sem expor rascunhos nem criar uma autoridade de
aprovação incompatível com a governança clínica e jurídica fail-closed.

## 2026-06-08 — Base central de referências

**Status:** aceita

**Decisão:** manter fontes reutilizáveis em `src/content/references`, com classificação de autoridade,
domínio, limitações e data de verificação. Fontes inline devem possuir registro central correspondente.

**Motivo:** reduzir duplicação, tornar limitações visíveis e impedir que fontes fracas sejam usadas
como sustentação principal de conteúdo governado.

## 2026-06-08 — Reconciliação documental obrigatória

**Status:** aceita

**Decisão:** antes de concluir qualquer tarefa, comparar a implementação real com o roadmap,
documentos afetados, decisões, agentes e skills locais. Atualizar somente os artefatos realmente
impactados, diferenciar infraestrutura implementada, conteúdo preparado, publicação bloqueada e
entrega pública, e manter toda documentação em português do Brasil com ortografia e acentuação
corretas.

**Motivo:** impedir divergências entre código e documentação, evitar que trabalho tecnicamente
concluído permaneça marcado como pendente e preservar a confiabilidade dos contratos usados por
agentes, contribuidores e revisores.

## 2026-06-08 — Decisões humanas auditáveis no painel local

**Status:** aceita

**Decisão:** separar no painel local a triagem automatizada das decisões humanas. Participantes
humanos cadastrados podem registrar pessoalmente revisões por domínio, exceções de segurança,
aprovação editorial e a transição local para `approved`. Cada ação exige confirmação nominal,
papel compatível, justificativa auditável, independência entre participantes e correspondência com
a versão atual. Registros editoriais são append-only e usam nomes resistentes a colisões.

**Motivo:** permitir que o fluxo humano seja executado localmente com rastreabilidade sem conceder
autoridade profissional a agentes, armazenar evidências privadas ou permitir que o painel faça
commit, push ou deploy.
