import http, { IncomingMessage, ServerResponse } from 'node:http';
import url from 'node:url';
import { db } from './database/db.js';
import { hashPassword, verifyPassword, hashToken, generateSecureToken } from './auth/crypto.js';
import { catalogSyncService } from './services/CatalogSyncService.js';
import { AdapterFactory } from './providers/AdapterFactory.js';
import { encryptCredentials } from './security/encryption.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const HOST = process.env.HOST || '0.0.0.0';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ALLOWED_ADMIN_ORIGIN = process.env.ADMIN_ORIGIN || 'https://painel.theussobral.shop';

// Production safety checks
if (IS_PRODUCTION) {
  if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
    console.error('❌ FATAL: Em ambiente de produção (NODE_ENV=production), DATABASE_URL ou DB_HOST é obrigatório.');
    process.exit(1);
  }
  if (!process.env.ADMIN_ORIGIN) {
    console.warn('⚠️ AVISO: ADMIN_ORIGIN não definido em produção. Utilizando padrão https://painel.theussobral.shop');
  }
}

// In-memory token store for admin fast lookup
const activeAdminTokens = new Set<string>();

// Differentiated Rate Limiting Tracker
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimitStores = {
  login: new Map<string, RateLimitBucket>(),
  adminLogin: new Map<string, RateLimitBucket>(),
  heartbeat: new Map<string, RateLimitBucket>(),
  content: new Map<string, RateLimitBucket>(),
  general: new Map<string, RateLimitBucket>(),
};

function checkBucketLimit(
  store: Map<string, RateLimitBucket>,
  ip: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = store.get(ip);
  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= maxRequests;
}

// Request body parser
async function parseJsonBody<T = any>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk: string | Buffer) => { raw += chunk; });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {} as T);
      } catch {
        reject(new Error('Corpo da requisição JSON inválido.'));
      }
    });
    req.on('error', reject);
  });
}

// JSON response with Security Headers and CORS
function sendJson(res: ServerResponse, status: number, data: any, req?: IncomingMessage): void {
  const origin = req?.headers.origin || '*';
  const corsOrigin = IS_PRODUCTION ? (origin === ALLOWED_ADMIN_ORIGIN ? origin : 'null') : '*';

  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Device-Id',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost:* https://api.theussobral.shop;",
  });
  res.end(JSON.stringify(data));
}

// HTML response with Security Headers
function sendHtml(res: ServerResponse, status: number, html: string): void {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  res.end(html);
}

// Extract bearer token
function getBearerToken(req: IncomingMessage): string | null {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7).trim();
}

// Admin Portal Single-Page App HTML
function getAdminPortalHtml(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MSPLAY — Painel Administrativo Oficial</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0a0a0a;
      --surface: #141414;
      --surface-hover: #1c1c1c;
      --border: #262626;
      --red: #E50914;
      --red-hover: #f6121d;
      --text: #ffffff;
      --text-muted: #888888;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
      display: flex;
    }
    aside {
      width: 260px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
    }
    .brand {
      padding: 24px;
      font-size: 1.5rem;
      font-weight: 900;
      color: var(--red);
      letter-spacing: 2px;
      border-bottom: 1px solid var(--border);
    }
    .brand span { color: #fff; font-size: 0.8rem; font-weight: 500; display: block; letter-spacing: 0; margin-top: 4px; }
    nav { padding: 16px 12px; flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .nav-btn {
      background: transparent;
      border: none;
      color: #b3b3b3;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: all 0.2s;
    }
    .nav-btn:hover, .nav-btn.active {
      background: rgba(229, 9, 20, 0.12);
      color: #fff;
    }
    .nav-btn.active {
      border-left: 3px solid var(--red);
    }
    main {
      flex: 1;
      padding: 32px 40px;
      overflow-y: auto;
      max-height: 100vh;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }
    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }
    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
    }
    .stat-title { font-size: 0.85rem; color: var(--text-muted); font-weight: 600; margin-bottom: 8px; }
    .stat-value { font-size: 2rem; font-weight: 800; color: #fff; }
    .table-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 32px;
    }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 0.9rem; }
    th { text-align: left; padding: 12px 16px; color: var(--text-muted); border-bottom: 1px solid var(--border); }
    td { padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge.active, .badge.online { background: rgba(70, 211, 105, 0.15); color: #46d369; }
    .badge.suspended, .badge.offline { background: rgba(229, 9, 20, 0.15); color: var(--red); }
    .badge.degraded { background: rgba(255, 170, 0, 0.15); color: #ffaa00; }
    .btn {
      background: var(--red);
      color: #fff;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
      font-size: 0.9rem;
      transition: background 0.2s;
    }
    .btn:hover { background: var(--red-hover); }
    .btn.secondary { background: #262626; color: #fff; }
    .btn.secondary:hover { background: #333; }
    .action-link { color: var(--red); text-decoration: none; font-weight: 600; cursor: pointer; margin-right: 12px; }
    .action-link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <aside>
    <div class="brand">
      MSPLAY
      <span>PAINEL ADMINISTRATIVO</span>
    </div>
    <nav>
      <button class="nav-btn active" onclick="showTab('dashboard')">📊 Dashboard</button>
      <button class="nav-btn" onclick="showTab('users')">👥 Clientes</button>
      <button class="nav-btn" onclick="showTab('devices')">📱 Dispositivos</button>
      <button class="nav-btn" onclick="showTab('sources')">🌐 Fontes & Provedores</button>
      <button class="nav-btn" onclick="showTab('config')">⚙️ Configuração</button>
      <button class="nav-btn" onclick="showTab('audit')">📜 Logs & Auditoria</button>
    </nav>
  </aside>

  <main id="app-content">
    <div style="display:flex; justify-content:center; align-items:center; height:100%;">
      Carregando dados do servidor...
    </div>
  </main>

  <script>
    let currentTab = 'dashboard';
    let adminData = { users: [], devices: [], config: {}, sources: [], auditLogs: [] };

    async function loadData() {
      try {
        const [u, d, c, s, a] = await Promise.all([
          fetch('/v1/admin/users').then(r => r.json()),
          fetch('/v1/admin/devices').then(r => r.json()),
          fetch('/v1/admin/config').then(r => r.json()),
          fetch('/v1/admin/sources').then(r => r.json()),
          fetch('/v1/admin/audit').then(r => r.json()),
        ]);
        adminData = { users: u, devices: d, config: c, sources: s, auditLogs: a };
        renderCurrentTab();
      } catch (err) {
        document.getElementById('app-content').innerHTML = '<div style="color:red; padding:20px;">Falha ao carregar dados administrativos.</div>';
      }
    }

    function showTab(tab) {
      currentTab = tab;
      document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');
      renderCurrentTab();
    }

    function renderCurrentTab() {
      const main = document.getElementById('app-content');
      if (currentTab === 'dashboard') {
        const activeUsers = (adminData.users || []).filter(u => u.status === 'active').length;
        const activeDevices = (adminData.devices || []).filter(d => d.status === 'active').length;
        main.innerHTML = \`
          <div class="header-bar">
            <div>
              <h1 style="font-size: 1.8rem; font-weight: 800;">Visão Geral</h1>
              <p style="color: var(--text-muted); font-size: 0.9rem;">Status do ecossistema e fontes de conteúdo</p>
            </div>
            <button class="btn secondary" onclick="loadData()">🔄 Atualizar</button>
          </div>

          <div class="card-grid">
            <div class="stat-card">
              <div class="stat-title">CLIENTES ATIVOS</div>
              <div class="stat-value">\${activeUsers} / \${adminData.users.length}</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">DISPOSITIVOS REGISTRADOS</div>
              <div class="stat-value">\${activeDevices}</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">VERSÃO CONFIGURAÇÃO</div>
              <div class="stat-value" style="color: var(--red);">v\${adminData.config.configVersion || 1}</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">FONTES HABILITADAS</div>
              <div class="stat-value">\${(adminData.sources || []).filter(s => s.enabled).length} / \${(adminData.sources || []).length}</div>
            </div>
          </div>

          <div class="table-card">
            <h2 style="font-size: 1.2rem; margin-bottom: 8px;">Dispositivos Conectados</h2>
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>UUID</th>
                  <th>Tipo</th>
                  <th>Versão App</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                \${adminData.devices.map(d => \`
                  <tr>
                    <td>\${d.deviceName}</td>
                    <td style="font-family:monospace; color:#aaa;">\${d.deviceUuid.substring(0,18)}...</td>
                    <td>\${d.deviceType}</td>
                    <td>\${d.appVersion}</td>
                    <td><span class="badge \${d.status}">\${d.status}</span></td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        \`;
      } else if (currentTab === 'users') {
        main.innerHTML = \`
          <div class="header-bar">
            <div>
              <h1 style="font-size: 1.8rem; font-weight: 800;">Gestão de Clientes</h1>
              <p style="color: var(--text-muted);">Criação, ativação e limites de aparelhos</p>
            </div>
            <button class="btn" onclick="promptCreateUser()">+ Novo Cliente</button>
          </div>

          <div class="table-card">
            <table>
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Status</th>
                  <th>Máx. Telas</th>
                  <th>Criado Em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                \${adminData.users.map(u => \`
                  <tr>
                    <td style="font-weight:700;">\${u.username}</td>
                    <td><span class="badge \${u.status}">\${u.status}</span></td>
                    <td>\${u.maxDevices} telas</td>
                    <td>\${new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <span class="action-link" onclick="toggleUserStatus('\${u.id}', '\${u.status === 'active' ? 'suspended' : 'active'}')">
                        \${u.status === 'active' ? 'Suspender' : 'Ativar'}
                      </span>
                    </td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        \`;
      } else if (currentTab === 'devices') {
        main.innerHTML = \`
          <div class="header-bar">
            <div>
              <h1 style="font-size: 1.8rem; font-weight: 800;">Dispositivos Registrados</h1>
              <p style="color: var(--text-muted);">Configuração por aparelho e status de sessão</p>
            </div>
          </div>

          <div class="table-card">
            <table>
              <thead>
                <tr>
                  <th>Dispositivo</th>
                  <th>UUID</th>
                  <th>Tipo</th>
                  <th>Último Acesso</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                \${adminData.devices.map(d => \`
                  <tr>
                    <td style="font-weight:700;">\${d.deviceName}</td>
                    <td style="font-family:monospace; color:#aaa;">\${d.deviceUuid}</td>
                    <td>\${d.deviceType}</td>
                    <td>\${new Date(d.lastSeen).toLocaleTimeString('pt-BR')}</td>
                    <td><span class="badge \${d.status}">\${d.status}</span></td>
                    <td>
                      <span class="action-link" onclick="toggleDeviceStatus('\${d.id}', '\${d.status === 'active' ? 'deactivated' : 'active'}')">
                        \${d.status === 'active' ? 'Desativar' : 'Reativar'}
                      </span>
                      <span class="action-link" onclick="overrideDeviceConfig('\${d.id}')">
                        Config Específica
                      </span>
                    </td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        \`;
      } else if (currentTab === 'sources') {
        main.innerHTML = \`
          <div class="header-bar">
            <div>
              <h1 style="font-size: 1.8rem; font-weight: 800;">Fontes & Provedores de Conteúdo</h1>
              <p style="color: var(--text-muted);">Gerenciamento de Adapters e Hierarquia de Failover</p>
            </div>
            <button class="btn" onclick="promptCreateSource()">+ Nova Fonte</button>
          </div>

          <div class="table-card">
            <table>
              <thead>
                <tr>
                  <th>Prioridade</th>
                  <th>Nome da Fonte</th>
                  <th>Tipo</th>
                  <th>Endpoint</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                \${adminData.sources.map(s => \`
                  <tr>
                    <td style="font-weight:800; color:var(--red);">#\${s.priority}</td>
                    <td style="font-weight:700;">\${s.name}</td>
                    <td><span style="font-family:monospace; color:#aaa;">\${s.type}</span></td>
                    <td style="font-family:monospace; color:#888; max-width:200px; overflow:hidden; text-overflow:ellipsis;">\${s.endpoint}</td>
                    <td><span class="badge \${s.isOnline ? 'online' : 'offline'}">\${s.isOnline ? 'ONLINE' : 'OFFLINE'}</span></td>
                    <td>
                      <span class="action-link" onclick="testSourceConnection('\${s.id}')">Testar Conexão</span>
                      <span class="action-link" onclick="toggleSourceOnline('\${s.id}', \${!s.isOnline})">
                        \${s.isOnline ? 'Desativar' : 'Ativar'}
                      </span>
                    </td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        \`;
      } else if (currentTab === 'config') {
        main.innerHTML = \`
          <div class="header-bar">
            <div>
              <h1 style="font-size: 1.8rem; font-weight: 800;">Configuração Global Remota</h1>
              <p style="color: var(--text-muted);">Versionamento e controle de recursos em tempo real</p>
            </div>
          </div>

          <div class="table-card" style="max-width: 600px;">
            <div style="margin-bottom: 20px;">
              <label style="display:block; color:#aaa; margin-bottom: 8px;">Versão Atual (configVersion):</label>
              <div style="font-size: 1.6rem; font-weight: 800; color: var(--red);">v\${adminData.config.configVersion}</div>
            </div>

            <div style="margin-bottom: 20px;">
              <label style="display:block; color:#aaa; margin-bottom: 8px;">Modo Manutenção:</label>
              <button class="btn secondary" onclick="toggleMaintenance(\${!adminData.config.maintenance})">
                \${adminData.config.maintenance ? '🔴 Desativar Manutenção' : '🟢 Ativar Manutenção'}
              </button>
            </div>

            <div style="margin-bottom: 24px;">
              <label style="display:block; color:#aaa; margin-bottom: 8px;">Grupo Padrão de Fontes:</label>
              <div style="font-weight: 600;">\${adminData.config.defaultSourceGroup}</div>
            </div>

            <button class="btn" onclick="bumpConfigVersion()">Incrementar Versão (+1)</button>
          </div>
        \`;
      } else if (currentTab === 'audit') {
        main.innerHTML = \`
          <div class="header-bar">
            <div>
              <h1 style="font-size: 1.8rem; font-weight: 800;">Trilha de Auditoria</h1>
              <p style="color: var(--text-muted);">Registro seguro de ações administrativas</p>
            </div>
          </div>

          <div class="table-card">
            <table>
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Autor</th>
                  <th>Ação</th>
                  <th>Alvo</th>
                </tr>
              </thead>
              <tbody>
                \${adminData.auditLogs.map(l => \`
                  <tr>
                    <td>\${new Date(l.timestamp).toLocaleString('pt-BR')}</td>
                    <td style="font-weight:700; color:var(--red);">\${l.actor}</td>
                    <td>\${l.action}</td>
                    <td>\${l.targetType || ''} \${l.targetId || ''}</td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        \`;
      }
    }

    async function toggleUserStatus(id, status) {
      await fetch('/v1/admin/users/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      loadData();
    }

    async function toggleDeviceStatus(id, status) {
      await fetch('/v1/admin/devices/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      loadData();
    }

    async function overrideDeviceConfig(id) {
      const sourceGroup = prompt('Informe o SourceGroup específico para este aparelho (ex: backup-test):', 'backup-test');
      if (!sourceGroup) return;
      await fetch('/v1/admin/devices/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configOverride: { sourceGroup, configVersion: 99 } })
      });
      alert('Configuração específica aplicada ao dispositivo.');
      loadData();
    }

    async function toggleSourceOnline(id, isOnline) {
      await fetch('/v1/admin/sources/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline })
      });
      loadData();
    }

    async function testSourceConnection(id) {
      const res = await fetch('/v1/admin/sources/' + id + '/test', { method: 'POST' }).then(r => r.json());
      alert('Resultado do Teste:\\nStatus: ' + res.status + '\\nLatência: ' + res.latencyMs + 'ms\\nCapabilities: ' + (res.capabilities || []).join(', ') + '\\nMensagem: ' + (res.message || 'Operacional'));
      loadData();
    }

    async function bumpConfigVersion() {
      await fetch('/v1/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configVersion: (adminData.config.configVersion || 1) + 1 })
      });
      loadData();
    }

    async function toggleMaintenance(val) {
      await fetch('/v1/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maintenance: val })
      });
      loadData();
    }

    async function promptCreateUser() {
      const username = prompt('Nome de usuário:');
      if (!username) return;
      const password = prompt('Senha de acesso:');
      if (!password) return;
      await fetch('/v1/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, maxDevices: 3 })
      });
      loadData();
    }

    async function promptCreateSource() {
      const name = prompt('Nome da fonte/provedor (ex: Servidor Xtream Beta):');
      if (!name) return;
      const type = prompt('Tipo da fonte (mock_catalog, xtream, m3u):', 'xtream');
      if (!type) return;
      const endpoint = prompt('Endpoint da fonte (URL):');
      if (!endpoint) return;
      const priority = parseInt(prompt('Prioridade (1 = maior):', '1') || '1', 10);
      await fetch('/v1/admin/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, endpoint, priority })
      });
      loadData();
    }

    loadData();
  </script>
</body>
</html>`;
}

// Server Request Router
const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const parsedUrl = url.parse(req.url || '/', true);
  const pathname = parsedUrl.pathname || '/';
  const method = req.method || 'GET';
  const ip = req.socket.remoteAddress || '127.0.0.1';

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    const origin = req.headers.origin || '*';
    const corsOrigin = IS_PRODUCTION ? (origin === ALLOWED_ADMIN_ORIGIN ? origin : 'null') : '*';
    res.writeHead(204, {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Device-Id',
    });
    res.end();
    return;
  }

  // ----------------------------------------------------
  // HEALTH & READINESS ENDPOINTS
  // ----------------------------------------------------
  if (pathname === '/health' && method === 'GET') {
    sendJson(res, 200, {
      status: 'ok',
      database: db.isReady() ? 'connected' : 'disconnected',
      provider: db.getProviderType(),
      version: '3.0.0',
      timestamp: Date.now(),
    }, req);
    return;
  }

  if (pathname === '/ready' && method === 'GET') {
    if (db.isReady()) {
      sendJson(res, 200, { ready: true }, req);
    } else {
      sendJson(res, 503, { ready: false, error: 'Banco de dados não inicializado.' }, req);
    }
    return;
  }

  try {
    // ----------------------------------------------------
    // OFFICIAL ADMIN PORTAL UI (/admin)
    // ----------------------------------------------------
    if (pathname === '/admin' || pathname === '/admin/') {
      sendHtml(res, 200, getAdminPortalHtml());
      return;
    }

    // Redirect legacy /adminsvg to /admin
    if (pathname === '/adminsvg' || pathname === '/adminsvg/') {
      res.writeHead(301, { Location: '/admin' });
      res.end();
      return;
    }

    // ----------------------------------------------------
    // NORMALIZED CONTENT API (PHASE 4)
    // ----------------------------------------------------
    if (pathname === '/v1/content/home' && method === 'GET') {
      const homeData = await catalogSyncService.getHome();
      sendJson(res, 200, homeData, req);
      return;
    }

    if (pathname === '/v1/content/live' && method === 'GET') {
      const channels = await catalogSyncService.getLiveChannels();
      sendJson(res, 200, channels, req);
      return;
    }

    if (pathname === '/v1/content/movies' && method === 'GET') {
      const page = parseInt((parsedUrl.query.page as string) || '1', 10);
      const pageSize = parseInt((parsedUrl.query.pageSize as string) || '20', 10);
      const genre = parsedUrl.query.genre as string | undefined;
      const movies = await catalogSyncService.getMovies(page, pageSize, genre);
      sendJson(res, 200, movies, req);
      return;
    }

    if (pathname === '/v1/content/series' && method === 'GET') {
      const page = parseInt((parsedUrl.query.page as string) || '1', 10);
      const pageSize = parseInt((parsedUrl.query.pageSize as string) || '20', 10);
      const genre = parsedUrl.query.genre as string | undefined;
      const series = await catalogSyncService.getSeries(page, pageSize, genre);
      sendJson(res, 200, series, req);
      return;
    }

    if (pathname.startsWith('/v1/content/series/') && method === 'GET') {
      const id = pathname.substring('/v1/content/series/'.length);
      const details = await catalogSyncService.getSeriesDetails(id);
      if (!details) {
        sendJson(res, 404, { success: false, error: 'Série não encontrada.' }, req);
        return;
      }
      sendJson(res, 200, details, req);
      return;
    }

    if (pathname === '/v1/content/search' && method === 'GET') {
      const q = (parsedUrl.query.q as string) || '';
      const results = await catalogSyncService.search(q);
      sendJson(res, 200, results, req);
      return;
    }

    if (pathname === '/v1/playback/resolve' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { contentId, deviceId } = body;
      if (!contentId) {
        sendJson(res, 400, { success: false, error: 'contentId é obrigatório para reprodução.' }, req);
        return;
      }
      const descriptor = await catalogSyncService.resolvePlayback(contentId, deviceId);
      sendJson(res, 200, descriptor, req);
      return;
    }

    // ----------------------------------------------------
    // CLIENT AUTH ENDPOINTS
    // ----------------------------------------------------
    if (pathname === '/v1/auth/login' && method === 'POST') {
      if (!checkBucketLimit(rateLimitStores.login, ip, 10, 300000)) {
        sendJson(res, 429, { success: false, error: 'Muitas tentativas de login. Aguarde 5 minutos.' }, req);
        return;
      }

      const body = await parseJsonBody(req);
      const { username, password, deviceId, deviceType, appVersion } = body;

      if (!username || typeof username !== 'string' || !username.trim() || !password || typeof password !== 'string') {
        sendJson(res, 400, { success: false, error: 'Usuário e senha válidos são obrigatórios.' }, req);
        return;
      }

      const user = await db.getUserByUsername(username.trim());
      if (!user) {
        sendJson(res, 401, { success: false, error: 'Usuário ou senha inválidos.' }, req);
        return;
      }

      const { valid, needsRehash } = verifyPassword(password, user.passwordHash, user.salt, user.iterations || 250000);
      if (!valid) {
        sendJson(res, 401, { success: false, error: 'Usuário ou senha inválidos.' }, req);
        return;
      }

      if (needsRehash) {
        const upgraded = hashPassword(password);
        await db.updateUser(user.id, {
          passwordHash: upgraded.hash,
          salt: upgraded.salt,
          iterations: upgraded.iterations,
        });
      }

      if (user.status === 'suspended') {
        sendJson(res, 403, { success: false, error: 'Esta conta está suspensa. Contate o suporte.' }, req);
        return;
      }

      if (user.expiresAt && new Date(user.expiresAt).getTime() < Date.now()) {
        sendJson(res, 403, { success: false, error: 'Sua assinatura expirou.' }, req);
        return;
      }

      if (deviceId) {
        const activeDevicesCount = await db.getUserDeviceCount(user.id);
        const existingDevice = await db.getDeviceByUuid(deviceId);
        if (!existingDevice && activeDevicesCount >= user.maxDevices) {
          sendJson(res, 403, {
            success: false,
            error: `Limite de dispositivos atingido (${user.maxDevices} telas). Desative um aparelho anterior no painel.`,
          }, req);
          return;
        }

        await db.registerOrUpdateDevice({
          deviceUuid: deviceId,
          userId: user.id,
          deviceType: deviceType || 'desktop',
          appVersion: appVersion || '3.0.0',
        });
      }

      const rawToken = generateSecureToken('msplay_tok');
      const tokenHash = hashToken(rawToken);

      await db.createSession({
        userId: user.id,
        deviceId: deviceId || undefined,
        tokenHash,
        expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
        revokedAt: null,
      });

      sendJson(res, 200, {
        success: true,
        token: rawToken,
        user: {
          id: user.id,
          username: user.username,
          status: user.status,
          expiresAt: user.expiresAt,
        },
      }, req);
      return;
    }

    if (pathname === '/v1/auth/logout' && method === 'POST') {
      const rawToken = getBearerToken(req);
      if (rawToken) {
        const tokenHash = hashToken(rawToken);
        await db.revokeSession(tokenHash);
      }
      sendJson(res, 200, { success: true }, req);
      return;
    }

    // ----------------------------------------------------
    // PROFILES ENDPOINTS
    // ----------------------------------------------------
    if (pathname === '/v1/profiles' && method === 'GET') {
      const token = getBearerToken(req);
      let userId = parsedUrl.query.userId as string | undefined;
      if (token) {
        const session = await db.findSessionByTokenHash(hashToken(token));
        if (session && session.userId) {
          userId = session.userId;
        }
      }
      const profiles = await db.getProfiles(userId);
      sendJson(res, 200, profiles, req);
      return;
    }

    if (pathname === '/v1/profiles' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
        sendJson(res, 400, { success: false, error: 'Nome de perfil é obrigatório.' }, req);
        return;
      }
      const token = getBearerToken(req);
      let resolvedUserId = body.userId || 'user_dev_01';
      if (token) {
        const session = await db.findSessionByTokenHash(hashToken(token));
        if (session && session.userId) {
          resolvedUserId = session.userId;
        }
      }
      const created = await db.createProfile({
        userId: resolvedUserId,
        name: body.name.trim(),
        avatar: body.avatar || '',
        color: body.color || 'linear-gradient(135deg, #e50914, #8b0000)',
      });
      sendJson(res, 201, created, req);
      return;
    }

    // ----------------------------------------------------
    // DEVICE CONFIG & HEARTBEAT
    // ----------------------------------------------------
    if (pathname === '/v1/device/config' && method === 'GET') {
      const deviceId = parsedUrl.query.deviceId as string | undefined;
      const globalConfig = await db.getAppConfig();
      const token = getBearerToken(req);
      let userOverride: any = null;

      if (token) {
        const session = await db.findSessionByTokenHash(hashToken(token));
        if (session && session.userId) {
          const user = await db.getUserById(session.userId);
          if (user && user.configOverride) {
            userOverride = user.configOverride;
          }
        }
      }

      if (!userOverride && parsedUrl.query.userId) {
        const user = await db.getUserById(parsedUrl.query.userId as string) || await db.getUserByUsername(parsedUrl.query.userId as string);
        if (user && user.configOverride) {
          userOverride = user.configOverride;
        }
      }

      let deviceOverride: any = null;
      if (deviceId) {
        const device = await db.getDeviceByUuid(deviceId);
        if (device && device.configOverride) {
          deviceOverride = device.configOverride;
        }
      }

      const effectiveConfig = {
        ...globalConfig,
        sourceGroup: globalConfig.defaultSourceGroup || 'default',
        ...(userOverride || {}),
        ...(deviceOverride || {}),
      };

      sendJson(res, 200, effectiveConfig, req);
      return;
    }

    if (pathname === '/v1/device/heartbeat' && method === 'POST') {
      if (!checkBucketLimit(rateLimitStores.heartbeat, ip, 60, 60000)) {
        sendJson(res, 429, { success: false, error: 'Rate limit de heartbeat atingido.' }, req);
        return;
      }

      const body = await parseJsonBody(req);
      const { deviceId, deviceType, appVersion } = body;

      if (deviceId) {
        await db.registerOrUpdateDevice({
          deviceUuid: deviceId,
          deviceType: deviceType || 'desktop',
          appVersion: appVersion || '3.0.0',
        });
      }

      sendJson(res, 200, { success: true, lastSeen: Date.now() }, req);
      return;
    }

    // ----------------------------------------------------
    // FAILOVER RESOLUTION TEST
    // ----------------------------------------------------
    if (pathname === '/v1/sources/resolve' && method === 'GET') {
      const sources = [...(await db.getSources())].sort((a, b) => a.priority - b.priority);
      const attempts: Array<{ sourceName: string; status: 'success' | 'failed' }> = [];
      let connectedSource: any = null;

      for (const s of sources) {
        if (!s.enabled || !s.isOnline) {
          attempts.push({ sourceName: s.name, status: 'failed' });
          continue;
        }
        attempts.push({ sourceName: s.name, status: 'success' });
        connectedSource = s;
        break;
      }

      if (!connectedSource) {
        sendJson(res, 503, { success: false, error: 'Todas as fontes mock falharam.' }, req);
        return;
      }

      sendJson(res, 200, {
        success: true,
        usedSource: connectedSource,
        attempts,
      }, req);
      return;
    }

    // ----------------------------------------------------
    // ADMIN ENDPOINTS
    // ----------------------------------------------------
    if (pathname === '/v1/admin/auth/login' && method === 'POST') {
      if (!checkBucketLimit(rateLimitStores.adminLogin, ip, 5, 300000)) {
        sendJson(res, 429, { success: false, error: 'Muitas tentativas no painel admin.' }, req);
        return;
      }

      const body = await parseJsonBody(req);

      if (IS_PRODUCTION && body.password === 'admin123') {
        sendJson(res, 401, { success: false, error: 'Credenciais de administrador inválidas.' }, req);
        return;
      }

      if (body.username === 'admin' && (body.password === 'admin123' || !IS_PRODUCTION)) {
        const token = generateSecureToken('admin_tok');
        activeAdminTokens.add(token);
        sendJson(res, 200, { success: true, token }, req);
        return;
      }

      sendJson(res, 401, { success: false, error: 'Credenciais de administrador inválidas.' }, req);
      return;
    }

    if (pathname === '/v1/admin/users' && method === 'GET') {
      const users = (await db.getUsers()).map(u => ({
        id: u.id,
        username: u.username,
        status: u.status,
        expiresAt: u.expiresAt,
        maxDevices: u.maxDevices,
        configOverride: u.configOverride,
        createdAt: u.createdAt,
      }));
      sendJson(res, 200, users, req);
      return;
    }

    if (pathname === '/v1/admin/users' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { username, password, maxDevices, expiresAt } = body;

      if (!username || typeof username !== 'string' || !username.trim() || !password || typeof password !== 'string') {
        sendJson(res, 400, { success: false, error: 'Nome de usuário e senha são obrigatórios.' }, req);
        return;
      }
      if (maxDevices !== undefined && (typeof maxDevices !== 'number' || maxDevices < 1)) {
        sendJson(res, 400, { success: false, error: 'Limite de telas (maxDevices) deve ser no mínimo 1.' }, req);
        return;
      }

      const { hash, salt, iterations } = hashPassword(password);
      const user = await db.createUser({
        username: username.trim(),
        passwordHash: hash,
        salt,
        iterations,
        status: 'active',
        expiresAt: expiresAt || null,
        maxDevices: maxDevices || 3,
      });
      await db.logAudit({
        actor: 'ADMIN',
        action: 'CREATE_USER',
        targetType: 'user',
        targetId: user.id,
        metadata: { username: user.username },
      });
      sendJson(res, 201, { success: true, user: { id: user.id, username: user.username } }, req);
      return;
    }

    if (pathname.startsWith('/v1/admin/users/') && method === 'PATCH') {
      const id = pathname.substring('/v1/admin/users/'.length);
      const body = await parseJsonBody(req);

      if (body.status && !['active', 'suspended', 'expired'].includes(body.status)) {
        sendJson(res, 400, { success: false, error: 'Status de usuário inválido. Valores aceitos: active, suspended, expired.' }, req);
        return;
      }

      const updated = await db.updateUser(id, body);
      await db.logAudit({
        actor: 'ADMIN',
        action: 'UPDATE_USER',
        targetType: 'user',
        targetId: id,
        afterState: body,
      });
      sendJson(res, 200, { success: !!updated, user: updated }, req);
      return;
    }

    if (pathname === '/v1/admin/devices' && method === 'GET') {
      const devices = await db.getDevices();
      sendJson(res, 200, devices, req);
      return;
    }

    if (pathname.startsWith('/v1/admin/devices/') && method === 'PATCH') {
      const id = pathname.substring('/v1/admin/devices/'.length);
      const body = await parseJsonBody(req);
      const updated = await db.updateDevice(id, body);
      await db.logAudit({
        actor: 'ADMIN',
        action: 'UPDATE_DEVICE',
        targetType: 'device',
        targetId: id,
        afterState: body,
      });
      sendJson(res, 200, { success: !!updated, device: updated }, req);
      return;
    }

    if (pathname === '/v1/admin/sources' && method === 'GET') {
      const sources = await db.getSources();
      sendJson(res, 200, sources, req);
      return;
    }

    if (pathname === '/v1/admin/sources' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.name || !body.endpoint) {
        sendJson(res, 400, { success: false, error: 'Nome e endpoint da fonte são obrigatórios.' }, req);
        return;
      }
      if (body.priority !== undefined && (typeof body.priority !== 'number' || body.priority < 1)) {
        sendJson(res, 400, { success: false, error: 'Prioridade deve ser um número maior ou igual a 1.' }, req);
        return;
      }
      const created = await db.createSource({
        name: body.name,
        type: body.type || 'mock_catalog',
        endpoint: body.endpoint,
        priority: body.priority || 1,
        enabled: body.enabled !== false,
        isOnline: body.isOnline !== false,
      });
      await db.logAudit({
        actor: 'ADMIN',
        action: 'CREATE_SOURCE',
        targetType: 'source',
        targetId: created.id,
        metadata: { name: created.name },
      });
      sendJson(res, 201, { success: true, source: created }, req);
      return;
    }

    if (pathname.startsWith('/v1/admin/sources/') && pathname.endsWith('/test') && method === 'POST') {
      const id = pathname.replace('/v1/admin/sources/', '').replace('/test', '');
      const sources = await db.getSources();
      const source = sources.find(s => s.id === id);

      if (!source) {
        sendJson(res, 404, { success: false, error: 'Fonte não encontrada.' }, req);
        return;
      }

      const adapter = AdapterFactory.createAdapter(source);
      const health = await adapter.testConnection();
      sendJson(res, 200, health, req);
      return;
    }

    if (pathname.startsWith('/v1/admin/sources/') && method === 'PATCH') {
      const id = pathname.substring('/v1/admin/sources/'.length);
      const body = await parseJsonBody(req);

      if (body.priority !== undefined && (typeof body.priority !== 'number' || body.priority < 1)) {
        sendJson(res, 400, { success: false, error: 'Prioridade deve ser um número maior ou igual a 1.' }, req);
        return;
      }

      const updated = await db.updateSource(id, body);
      await db.logAudit({
        actor: 'ADMIN',
        action: 'UPDATE_SOURCE',
        targetType: 'source',
        targetId: id,
        afterState: body,
      });
      sendJson(res, 200, { success: !!updated, source: updated }, req);
      return;
    }

    if (pathname === '/v1/admin/config' && method === 'GET') {
      const config = await db.getAppConfig();
      sendJson(res, 200, config, req);
      return;
    }

    if (pathname === '/v1/admin/config' && method === 'PATCH') {
      const body = await parseJsonBody(req);
      const updated = await db.updateAppConfig(body);
      await db.logAudit({
        actor: 'ADMIN',
        action: 'UPDATE_CONFIG',
        targetType: 'config',
        targetId: 'global',
        afterState: body,
      });
      sendJson(res, 200, { success: true, config: updated }, req);
      return;
    }

    if (pathname === '/v1/admin/audit' && method === 'GET') {
      const logs = await db.getAuditLogs();
      sendJson(res, 200, logs, req);
      return;
    }

    // Default 404
    sendJson(res, 404, { success: false, error: `Endpoint não encontrado: ${method} ${pathname}` }, req);
  } catch (err: any) {
    if (!IS_PRODUCTION) {
      console.error('[Server Internal Error]', err);
    }
    sendJson(res, 500, { success: false, error: 'Erro interno no servidor.' }, req);
  }
});

async function bootstrap() {
  await db.init();
  server.listen(PORT, HOST, () => {
    console.info(`[MSPLAY Backend] 🚀 Servidor ativo em http://${HOST}:${PORT}`);
    console.info(`[MSPLAY Admin]   🌐 Painel Administrativo Oficial em http://localhost:${PORT}/admin`);
  });
}

bootstrap().catch(err => {
  console.error('❌ Falha na inicialização do servidor:', err);
  process.exit(1);
});

export default server;
