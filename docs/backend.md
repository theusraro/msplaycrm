# MSPLAY — Documentação do Backend (Fase 3 Consolidada)

## 📌 Visão Geral
O backend do MSPLAY foi construído em Node.js com TypeScript e oferece uma camada robusta de controle remoto, autenticação com limites de telas, gerenciamento de fontes mock e painel administrativo.

## 💾 Camada de Dados (Database Engine)
* **Produção:** **PostgreSQL** é o banco de dados persistente oficial (`PostgresDatabaseProvider`).
* **Desenvolvimento Local:** **DEV Storage** isolado em `server/data/msplay_dev_storage.json` (`JsonDevDatabaseProvider`).
* **Trava de Segurança:** O servidor se recusa a iniciar em modo `NODE_ENV=production` sem PostgreSQL configurado.

---

## 🔒 Segurança e Hashing
* **Hash de Senhas:** PBKDF2/SHA-512 com 100.000 iterações e salt aleatório de 16 bytes. Suporte a upgrade transparente de hashes antigos no login.
* **Sessões:** Tokens são armazenados exclusivamente como hash SHA-256 (`token_hash`), evitando vazamento em dump de banco.
* **Rate Limiting Diferenciado:**
  * Login Cliente: 10 tentativas / 5 min
  * Login Admin: 5 tentativas / 5 min
  * Heartbeat: 60 req / min
  * Endpoints Gerais: 120 req / min

---

## 📡 Endpoints Oficiais

### 🔍 Diagnóstico
* `GET /health` — Status da API e status da conexão com banco.
* `GET /ready` — Readiness probe para reverse proxies.

### 📱 Cliente MSPLAY
* `POST /v1/auth/login` — Autenticação com verificação de telas.
* `POST /v1/auth/logout` — Revogação de sessão.
* `GET /v1/profiles` — Perfis do usuário.
* `POST /v1/profiles` — Criação de novo perfil.
* `GET /v1/device/config?deviceId={uuid}` — Configuração remota (com precedência por dispositivo).
* `POST /v1/device/heartbeat` — Sinal de vida com rate limiting.
* `GET /v1/sources/resolve` — Resolução de cluster com failover (Prioridade 1 ➔ 2 ➔ 3).

### 🛠️ Painel Administrativo
* **Interface Web Oficial:** `http://localhost:3001/admin` (DEV) | `https://painel.theussobral.shop` (PROD)
* `POST /v1/admin/auth/login` — Login administrativo.
* `GET / POST / PATCH /v1/admin/users` — Gestão de clientes e limite de telas.
* `GET / PATCH /v1/admin/devices` — Gestão e override de configuração por aparelho.
* `GET / PATCH /v1/admin/sources` — Gestão de clusters mock e teste de failover.
* `GET / PATCH /v1/admin/config` — Controle de versão global (`configVersion`).
* `GET /v1/admin/audit` — Consulta de logs de auditoria.
