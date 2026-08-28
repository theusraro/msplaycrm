# MSPLAY — Painel Administrativo Oficial

## 🌐 Rotas Oficiais de Acesso
* **Ambiente Local (DEV):** [http://localhost:3001/admin](http://localhost:3001/admin)
* **Ambiente de Produção (PROD):** [https://painel.theussobral.shop](https://painel.theussobral.shop)

> [!IMPORTANT]
> A rota `/admin` é a única rota oficial do painel tanto em desenvolvimento (`http://localhost:3001/admin`) quanto em produção (`https://painel.theussobral.shop`). Qualquer chamada legada é redirecionada automaticamente via HTTP 301.

---

## 🔑 Credenciais
* **Desenvolvimento (DEV):** `admin` / `admin123` (disponível apenas em modo DEV).
* **Produção (PROD):** O administrador deve ser provisionado via CLI segura:
```bash
node server/dist/cli/createAdmin.js <username> <password>
```

---

## 🎛️ Funcionalidades do Painel

1. **Dashboard:** Métricas agregadas de clientes, dispositivos e clusters.
2. **Gestão de Clientes:** Criação e controle de contas e limites de telas simultâneas (`maxDevices`).
3. **Dispositivos & Configuração por Aparelho:**
   * Visualização de aparelhos ativos e versão instalada.
   * Aplicação de configuração customizada para dispositivos específicos (ex: forçar grupo `cluster-vip` na *TV Sala* enquanto a *TV Quarto* utiliza o grupo padrão).
4. **Fontes & Simulação de Redundância:** Alternância do status online/offline das fontes mock e execução do teste de failover com 1 clique.
5. **Configuração Remota Global:** Incremento da `configVersion` e ativação de modo de manutenção.
6. **Auditoria:** Registro cronológico de todas as modificações realizadas por administradores.
