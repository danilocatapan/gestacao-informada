# Evidências visuais

Esta pasta guarda screenshots gerados pelos testes Playwright.

- `artigo-*-desktop.png` e `artigo-*-mobile.png`: seis artigos aprovados, com fontes, aviso de transparência, console limpo e ausência de overflow.
- `inicio-*`, `artigos-*`, `busca-*`, `acolhimento-e-luto-*`, `entender-a-perda-*` e `trombofilias-e-investigacao-*`: navegação por necessidades, descoberta dos artigos e jornadas públicas em desktop e mobile.
- `painel-editorial-fluxo-desktop.png`: fluxo simplificado após o OK do mantenedor.
- `painel-editorial-mobile.png`: hard blocker sem opção de override em viewport mobile.
- demais arquivos: rotas institucionais validadas em desktop e mobile.

Antes de concluir mudanças visuais:

- validar todas as rotas alteradas em desktop e mobile;
- verificar navegação, overflow horizontal e erros de console;
- confirmar textos visíveis em português do Brasil;
- substituir as evidências quando a interface mudar.

Os testes públicos ficam em `tests/smoke.spec.ts`; o painel local é coberto por `tests/editorial-panel.spec.ts`.
