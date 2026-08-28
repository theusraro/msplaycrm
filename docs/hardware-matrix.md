# MSPLAY — Matriz de Testes em Hardware & Plataformas

| Platform | Device | OS / Environment | App Version | Login | Navigation | Catalog | Playback | D-pad / Touch | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Desktop Web** | Chrome / Edge | Windows 11 | `0.9.0-homolog` | PASS | PASS | PASS | PASS | Mouse/Keys | **PASS** | 1080p e 4K auditados com controles de player completos. |
| **Mobile Simulation** | iPhone / Galaxy | iOS / Android Viewport | `0.9.0-homolog` | PASS | PASS | PASS | PASS | Touch/Swipe | **PASS** | Bottom navigation bar, scroll fluido vertical e horizontal. |
| **Tablet Simulation** | iPad Pro | iPadOS Viewport | `0.9.0-homolog` | PASS | PASS | PASS | PASS | Touch/Keys | **PASS** | Grid adaptativo de 3 a 4 colunas com menu lateral. |
| **TV Mode Simulation** | Desktop TV Mode | Viewport 1080p/4K | `0.9.0-homolog` | PASS | PASS | PASS | PASS | D-pad Virtual | **PASS** | Safe areas de 48px, foco vermelho evidente com glow e scale. |
| **Android Smartphone Físico** | Celular Android Real | Android 12+ | `0.9.0-homolog` | - | - | - | - | Touch | **NOT TESTED** | Hardware físico pendente de homologação na bancada de testes. |
| **TV Box Físico** | TV Box Genérica | Android 9/11/13 | `0.9.0-homolog` | - | - | - | - | Controle IR/BT | **NOT TESTED** | Pendente de teste com controle remoto físico. |
| **Smart TV Certificada** | Android TV / Google TV | Android TV 11+ | `0.9.0-homolog` | - | - | - | - | Controle BT | **NOT TESTED** | Pendente de teste em TV física certificada. |
| **Capacitor Build** | Android Project | Gradle Debug | `0.9.0-homolog` | - | - | - | - | - | **PREPARADO** | `capacitor.config.json` e build estático prontos para sync. |
