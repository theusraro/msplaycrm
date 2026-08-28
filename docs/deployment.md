# MSPLAY — Guia de Deploy e Produção

## 🌐 Domínios Oficiais em Produção
* **API Principal:** `https://api.theussobral.shop`
* **Painel Administrativo:** `https://painel.theussobral.shop`

---

## 🔒 Variáveis de Ambiente de Produção

Crie o arquivo `.env` seguro no servidor (nunca comite no Git):

```env
NODE_ENV=production
PORT=3001
HOST=127.0.0.1
DATABASE_URL=postgresql://msplay_prod_user:SENHA_FORTE_AQUI@localhost:5432/msplay_prod_db
DB_PROVIDER=postgres
ADMIN_ORIGIN=https://painel.theussobral.shop
```

---

## 🐘 1. Banco de Dados PostgreSQL & Migrations

### Instalação e Execução de Migrations:
```bash
# Executar migrations automáticas
npm run migrate

# Criar primeiro administrador de produção de forma segura
node server/dist/cli/createAdmin.js admin_master SENHA_SEGURA_AQUI
```

### Estratégia de Backup Automático (pg_dump):
```bash
# Backup diário
pg_dump -U msplay_prod_user -d msplay_prod_db -F c -b -v -f "/var/backups/msplay/msplay_$(date +%Y%m%d_%H%M%S).dump"

# Restaurar backup
pg_restore -U msplay_prod_user -d msplay_prod_db -v "/var/backups/msplay/arquivo.dump"
```

---

## 🌐 2. Configuração de Reverse Proxy

### Opção A: Nginx (`/etc/nginx/sites-available/msplay.conf`)

```nginx
# API — api.theussobral.shop
server {
    server_name api.theussobral.shop;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/api.theussobral.shop/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.theussobral.shop/privkey.pem;
}

# Painel Administrativo — painel.theussobral.shop
server {
    server_name painel.theussobral.shop;

    location / {
        proxy_pass http://127.0.0.1:3001/admin;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/painel.theussobral.shop/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/painel.theussobral.shop/privkey.pem;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.theussobral.shop painel.theussobral.shop;
    return 301 https://$host$request_uri;
}
```

### Opção B: Caddy (`/etc/caddy/Caddyfile`)

```caddy
api.theussobral.shop {
    reverse_proxy 127.0.0.1:3001
}

painel.theussobral.shop {
    rewrite * /admin{uri}
    reverse_proxy 127.0.0.1:3001
}
```

---

## 📱 3. Build e Deploy do Aplicativo Cliente

```bash
# Configurar apontamento para produção
export VITE_API_URL="https://api.theussobral.shop"
export VITE_USE_REMOTE_BACKEND="true"

# Gerar build estático otimizado
npm run build
```
O diretório `dist/` gerado está pronto para publicação em CDN/Web ou empacotamento via Capacitor APK.
