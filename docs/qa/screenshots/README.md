# Evidencias visuais

Esta pasta guarda screenshots gerados durante a validacao Playwright de interfaces.

Antes de concluir mudancas visuais:

- validar todas as rotas alteradas em desktop e mobile;
- verificar navegacao, overflow horizontal e erros de console;
- confirmar que os textos visiveis estao em portugues do Brasil;
- substituir as evidencias quando a interface mudar de forma relevante.

Os smoke tests versionados em `tests/smoke.spec.ts` cobrem carregamento, console e overflow horizontal nas rotas públicas em desktop e mobile.
