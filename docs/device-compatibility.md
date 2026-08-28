# MSPLAY — Matriz Real de Compatibilidade de Dispositivos

| Plataforma / Ambiente | Resolução | Método de Entrada | Status de Validação | Observações |
| :--- | :--- | :--- | :--- | :--- |
| **Navegador Desktop (1080p)** | 1920x1080 | Teclado & Mouse | **TESTADO & APROVADO** | Navegação por clique, hover, atalhos de teclado e player com controles de seek e volume. |
| **Navegador Desktop (4K Simulação)** | 3840x2160 | Teclado & Mouse | **TESTADO & APROVADO** | UI escala proporcionalmente com fontes e assets vetoriais SVG nítidos. |
| **Mobile Viewport (iPhone / Galaxy)** | 390x844 / 360x800 | Touch / Swipe | **TESTADO & APROVADO** | Bottom navigation bar ativa, carrosséis com scroll/swipe horizontal, layout de detalhes vertical. |
| **Tablet Viewport (iPad)** | 768x1024 | Touch & Teclado | **TESTADO & APROVADO** | Grid adaptativo de 3 a 4 colunas com menu lateral responsivo. |
| **TV Mode (Simulação D-pad no Browser)** | 1920x1080 | Setas, Enter, Esc | **TESTADO & APROVADO** | D-pad virtual, safe area de 48px, foco vermelho evidente com glow e scale. |
| **Android TV Físico** | Variado | Controle Remoto IR/BT | **NÃO TESTADO EM HARDWARE FÍSICO** | Mapeamento de KeyCode padrão implementado; homologação física pendente para fase de testes de hardware. |
| **Google TV Físico** | Variado | Controle Remoto BT | **NÃO TESTADO EM HARDWARE FÍSICO** | Pendente de teste em aparelho real. |
| **TV Box Físico (Android 9/11/13)** | Variado | Controle Remoto IR | **NÃO TESTADO EM HARDWARE FÍSICO** | Pendente de teste em aparelho real. |
| **Android APK (Capacitor)** | N/A | N/A | **PREPARADO** | Configurações Capacitor prontas para sincronização (`npx cap sync android`). |
