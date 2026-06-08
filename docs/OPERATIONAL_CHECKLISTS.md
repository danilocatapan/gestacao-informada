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

Validação operacional pendente:

1. Abrir um pull request de teste.
2. Confirmar que o merge fica bloqueado enquanto `validate` não concluir.
3. Confirmar que um push direto para `main` é recusado.
4. Registrar a data da verificação no pull request.

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

O cadastro torna o fluxo disponível, mas não aprova conteúdo nem autoriza publicação. Artigos e
documentos permanecem em `draft` até submissão formal e registros editoriais válidos.
