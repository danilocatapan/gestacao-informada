# Instrucoes para agentes

## Contexto

Gestacao Informada sera um portal brasileiro de informacao responsavel e acolhimento para familias afetadas por perda gestacional.

Antes de alterar o produto, leia:

- `docs/PRODUCT.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`

Use a skill local `.codex/skills/gestacao-informada/SKILL.md` em tarefas de produto, conteudo clinico, arquitetura ou desenvolvimento deste repositorio.

## Regras essenciais

- Nao apresentar conteudo como diagnostico, prescricao ou recomendacao individual.
- Nao publicar doses, calculadoras de medicamentos ou cronogramas terapeuticos sem aprovacao clinica e juridica explicita.
- Diferenciar evidencias, diretrizes, opinioes profissionais e relatos pessoais.
- Exigir fonte, autoria e data de revisao para conteudo clinico.
- Tratar perda gestacional e luto com linguagem respeitosa, sem falsas promessas.
- Nao expor dados pessoais, clinicos ou relatos identificaveis sem consentimento documentado.

## Desenvolvimento

- Registrar decisoes estruturais relevantes em `docs/DECISIONS.md`.
- Manter mudancas pequenas, verificaveis e alinhadas ao roadmap.
- Incluir testes proporcionais ao risco quando houver codigo.
- Garantir acessibilidade e experiencia responsiva nas interfaces.
- Nunca incluir segredos ou credenciais no repositorio.

## Regras canonicas de implementacao

- Nao adicionar framework de componentes por padrao. Islands React ou Preact exigem necessidade real e decisao registrada.
- Usar `withBaseUrl()` para paths relativos e `withCanonicalUrl()` para URLs absolutas. Nao concatenar o base path manualmente.
- Conteudo medico deve residir na collection `articles`, nunca hardcoded em componentes ou paginas.
- Artigos medicos somente podem gerar rota publica com `status: approved` e todos os requisitos editoriais preenchidos.
- Toda ocorrencia publicavel de termo sensivel exige uma excecao documentada em `safetyReview`.
- `npm run test:content` deve rodar antes do commit. O CI e o gate obrigatorio para merge e deploy.
- Toda entrega de interface deve ser validada com Playwright em desktop e mobile, cobrindo todas as rotas e fluxos alterados.
- Salvar screenshots de evidencia em `docs/qa/screenshots/` e verificar overflow, componentes quebrados e erros de console.
- Todo texto visivel da interface deve estar em portugues do Brasil, com linguagem clara, limpa, profissional e acolhedora.

## Economia de tokens e contexto

- Sempre prefixar com `rtk` os comandos de terminal compativeis para reduzir o consumo de tokens.
- Quando `rtk` nao executar diretamente um cmdlet interno do PowerShell, preferir um comando equivalente compativel ou usar `rtk proxy`; executar sem `rtk` apenas quando nao houver alternativa funcional.
- Consultar o contexto do projeto de forma incremental: comecar por este arquivo, pela skill local e pelos documentos obrigatorios relevantes para a tarefa.
- Usar buscas direcionadas, como `rtk rg`, antes de abrir arquivos inteiros ou explorar diretorios amplos.
- Evitar reler arquivos, carregar saidas extensas ou incluir contexto que nao contribua diretamente para a tarefa atual.
- Usar `rtk gain` periodicamente para acompanhar a economia de tokens.
