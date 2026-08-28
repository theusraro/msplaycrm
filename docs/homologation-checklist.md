# MSPLAY — Checklist de Homologação Real (Fase 4.5)

| Item | Descrição | Status Real | Observações |
| :--- | :--- | :--- | :--- |
| **[x] URLs Oficiais** | `/admin` e domínios oficiais sem sufixos incorretos | **APROVADO** | Rota `/admin` respondendo HTTP 200 / 301 para legado. |
| **[x] PostgreSQL Provider** | Abstração `PostgresDatabaseProvider` com schema relacional | **APROVADO** | Testado via suíte automatizada e migrations. |
| **[x] Migrations SQL** | `001_initial_schema.sql`, `002_device_config.sql`, `003_audit.sql` | **APROVADO** | Migrations executadas e versionadas via `_migrations`. |
| **[x] Secrets & Criptografia** | AES-256-GCM para credenciais de fontes e PBKDF2 (250k) | **APROVADO** | Criptografia testada com chave segura. |
| **[x] Proteção SSRF** | Bloqueio de loopback, metadados de nuvem e esquemas não-HTTP | **APROVADO** | Bloqueio validado na suíte de testes. |
| **[x] Catálogo Normalizado** | Endpoints `/v1/content/*` (Home, Live, Movies, Series, Search) | **APROVADO** | Respostas normalizadas consumidas pela UI. |
| **[x] Resolução de Playback** | `POST /v1/playback/resolve` com `StreamDescriptor` seguro | **APROVADO** | Streams HLS / MP4 resolvidos sem expor segredos. |
| **[x] Failover de Fontes** | Hierarquia de prioridade (1 ➔ 2 ➔ 3) e recuperação automática | **APROVADO** | Comutação de cluster e restauração testadas. |
| **[x] Configuração Remota** | Versionamento (`configVersion`) e override por aparelho | **APROVADO** | TV Sala override vs TV Quarto global testado. |
| **[x] Cache Seguro** | Preservação do cache local em caso de instabilidade | **APROVADO** | Política de cache validada no cliente. |
| **[x] UI do App Intacta** | Zero alterações visuais / interface estritamente congelada | **APROVADO** | App continua com a mesma interface aprovada. |
| **[x] APK Homologação** | Configuração Capacitor e assets preparados (`0.9.0-homolog`) | **PREPARADO** | Configurações Capacitor sincronizadas. |
| **[ ] Celular Android Físico** | Instalação e teste em aparelho físico de teste | **PENDENTE** | Aguardando teste em dispositivo móvel real conectado. |
| **[ ] TV Box Físico** | Navegação D-pad em controle remoto físico | **PENDENTE** | Aguardando teste em TV Box físico de homologação. |
| **[ ] Android TV / Google TV** | Navegação em Smart TV certificada | **PENDENTE** | Aguardando homologação em Smart TV física. |
