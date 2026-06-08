# Checklists operacionais

Este documento reúne ações manuais que não podem ser concluídas somente por alterações no
repositório. Cada item deve permanecer pendente no roadmap até existir evidência verificável de sua
execução.

## Proteção da branch principal

Regras aplicadas à branch `main` em 8 de junho de 2026:

- [x] exigir pull request antes do merge;
- [x] exigir o check de status `validate`;
- [x] bloquear force push;
- [x] bloquear exclusão da branch;
- [x] manter zero aprovações humanas obrigatórias enquanto houver apenas um mantenedor.

Validação operacional:

- [x] Pull request aberto, validado pelo check `validate` e mesclado em 8 de junho de 2026: [PR #1](https://github.com/danilocatapan/gestacao-informada/pull/1).
- [ ] Confirmar em teste separado que um push direto para `main` é recusado.

## Cadastro de participantes editoriais

O cadastro de revisores e aprovadores exige confirmação humana prévia. Não registrar participantes
fictícios, credenciais não verificadas ou dados pessoais desnecessários.

Para cada participante:

- [ ] confirmar nome público e papel editorial aceito;
- [ ] verificar credenciais profissionais em fonte apropriada ao domínio;
- [ ] obter consentimento documentado para exibir nome, função, credenciais e biografia;
- [ ] confirmar que o participante não acumulará autoria, revisão e aprovação do mesmo conteúdo;
- [ ] manter evidências privadas de consentimento e verificação fora do repositório;
- [ ] cadastrar somente os dados públicos necessários em `src/content/contributors`;
- [ ] executar `npm run test:content` após o cadastro.

Papéis ainda necessários:

- [ ] revisor clínico;
- [ ] revisor psicológico;
- [ ] revisor jurídico;
- [ ] aprovador editorial independente.

O cadastro torna o fluxo disponível, mas não aprova conteúdo nem autoriza publicação. Os seis
artigos prioritários estão em `in_review`; conteúdos ainda não submetidos permanecem em `draft`.

## Publicação dos seis artigos iniciais

- [x] gerar pareceres somente dos seis artigos com `npm run editorial:review:mvp`;
- [ ] iniciar o site e o painel local;
- [x] resolver apontamentos automatizados e enviar cada artigo para `in_review`;
- [ ] registrar pessoalmente cada revisão clínica exigida;
- [ ] registrar pessoalmente as três revisões psicológicas exigidas;
- [ ] registrar exceções de segurança necessárias e repetir a triagem quando a versão mudar;
- [ ] registrar aprovação editorial independente e transição local para `approved`;
- [ ] executar auditoria editorial, `npm test`, `npm run test:e2e:editorial` e `npm run test:e2e`;
- [ ] abrir PR, aguardar o check `validate` e mesclar em `main`;
- [ ] confirmar as seis rotas no GitHub Pages antes de concluir o item correspondente no roadmap.

O painel não realiza commit, push ou deploy. A promoção local para `approved` cria rotas somente no
próximo build e continua sujeita aos gates do CI.
