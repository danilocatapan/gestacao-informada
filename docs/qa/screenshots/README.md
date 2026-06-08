# Evidências visuais

Esta pasta guarda screenshots gerados durante a validação Playwright de interfaces.

- `painel-editorial-desktop.png`: painel local com artigo, marcação e apontamento em desktop.
- `painel-editorial-mobile.png`: painel local responsivo, sem overflow, em viewport mobile.

Antes de concluir mudanças visuais:

- validar todas as rotas alteradas em desktop e mobile;
- verificar navegação, overflow horizontal e erros de console;
- confirmar que os textos visíveis estão em português do Brasil;
- substituir as evidências quando a interface mudar de forma relevante.

Os smoke tests versionados em `tests/smoke.spec.ts` cobrem carregamento, console e overflow horizontal nas rotas públicas em desktop e mobile.
