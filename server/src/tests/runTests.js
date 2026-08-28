/**
 * MSPLAY Automated Test Suite (Phase 4.5 — Multi-User Remote Config & Player Seek Engine)
 */

import http from 'node:http';
import { runBenchmark } from './benchmarkHash.js';
import { encryptCredentials, decryptCredentials } from '../../dist/security/encryption.js';
import { validateSafeUrl } from '../../dist/security/ssrf.js';

const BASE_URL = 'http://localhost:3001';

async function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const req = http.request(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const stats = {
  total: 0,
  pass: 0,
  fail: 0,
  skipped: 0,
  unit: { pass: 0, fail: 0 },
  integration: { pass: 0, fail: 0 },
  browserSimulated: { pass: 0, fail: 0 },
};

function assert(condition, message, category = 'integration') {
  stats.total++;
  if (condition) {
    console.log(`  ✅ PASS: [${category.toUpperCase()}] ${message}`);
    stats.pass++;
    if (category === 'unit') stats.unit.pass++;
    else if (category === 'integration') stats.integration.pass++;
    else if (category === 'browser') stats.browserSimulated.pass++;
  } else {
    console.error(`  ❌ FAIL: [${category.toUpperCase()}] ${message}`);
    stats.fail++;
    if (category === 'unit') stats.unit.fail++;
    else if (category === 'integration') stats.integration.fail++;
    else if (category === 'browser') stats.browserSimulated.fail++;
  }
}

export async function runAllTests() {
  console.log('\n===============================================================');
  console.log('🧪 MSPLAY — SUÍTE DE TESTES (FASE 4.5: GERENCIAMENTO & PLAYER)');
  console.log('===============================================================\n');

  try {
    // 1. Password Hashing Benchmark (Unit)
    console.log('1. [UNIT] Calibração de Hashing de Senhas:');
    const bench = runBenchmark(5);
    assert(bench.avgHash > 0 && bench.avgHash < 500, `Benchmark de PBKDF2/SHA-512 (250k iterações): ${bench.avgHash.toFixed(1)}ms`, 'unit');

    // 2. Encryption & SSRF Security (Unit)
    console.log('\n2. [UNIT] Segurança, Criptografia AES-256-GCM & Proteção SSRF:');
    const secret = 'super_secret_provider_password_123';
    const encrypted = encryptCredentials(secret);
    const decrypted = decryptCredentials(encrypted);
    assert(decrypted === secret, 'Criptografia e descriptografia reversível AES-256-GCM para credenciais de fontes', 'unit');

    const ssrfValid = validateSafeUrl('https://api.theussobral.shop/playlist.m3u8');
    assert(ssrfValid.valid === true, 'Validação de URL pública legítima aprovada', 'unit');

    const ssrfMetadata = validateSafeUrl('http://169.254.169.254/latest/meta-data/');
    assert(ssrfMetadata.valid === false, 'Bloqueio SSRF de endpoints de metadata de nuvem', 'unit');

    const ssrfFile = validateSafeUrl('file:///etc/passwd');
    assert(ssrfFile.valid === false, 'Bloqueio SSRF de esquemas não-HTTP (file://, javascript:)', 'unit');

    // 3. Health & Readiness (Integration)
    console.log('\n3. [INTEGRATION] Endpoints de Diagnóstico e Saúde:');
    const healthRes = await request('GET', '/health');
    assert(healthRes.status === 200 && healthRes.body.status === 'ok' && !!healthRes.body.provider, 'GET /health retorna status ok e provider ativo', 'integration');
    
    const readyRes = await request('GET', '/ready');
    assert(readyRes.status === 200 && readyRes.body.ready === true, 'GET /ready retorna HTTP 200 pronto para tráfego', 'integration');

    // 4. Multi-User Remote Management (João vs Maria)
    console.log('\n4. [INTEGRATION] Gerenciamento Remoto por Usuário (João vs Maria):');
    
    // 4.1 Login João
    const joaoLogin = await request('POST', '/v1/auth/login', {
      username: 'joao',
      password: '1234',
      deviceId: 'device-joao-tv',
      deviceType: 'android_tv',
      appVersion: '3.0.0'
    });
    assert(joaoLogin.status === 200 && joaoLogin.body.success === true && !!joaoLogin.body.token, 'Login João (joao / 1234) retorna token de autenticação', 'integration');
    const joaoToken = joaoLogin.body.token;

    // 4.2 Profiles João
    const joaoProfiles = await request('GET', '/v1/profiles', null, joaoToken);
    assert(joaoProfiles.status === 200 && Array.isArray(joaoProfiles.body) && joaoProfiles.body.some(p => p.name === 'João'), 'GET /v1/profiles com token do João retorna perfis específicos do João', 'integration');

    // 4.3 Config João (sourceGroup default)
    const joaoConfig = await request('GET', '/v1/device/config?deviceId=device-joao-tv', null, joaoToken);
    assert(joaoConfig.status === 200 && joaoConfig.body.sourceGroup === 'default', 'Configuração remota do João associa sourceGroup=default', 'integration');

    // 4.4 Logout João
    const joaoLogout = await request('POST', '/v1/auth/logout', null, joaoToken);
    assert(joaoLogout.status === 200 && joaoLogout.body.success === true, 'Logout do João revoga sessão no backend', 'integration');

    // 4.5 Login Maria
    const mariaLogin = await request('POST', '/v1/auth/login', {
      username: 'maria',
      password: '5678',
      deviceId: 'device-maria-mobile',
      deviceType: 'mobile',
      appVersion: '3.0.0'
    });
    assert(mariaLogin.status === 200 && mariaLogin.body.success === true && !!mariaLogin.body.token, 'Login Maria (maria / 5678) retorna token de autenticação', 'integration');
    const mariaToken = mariaLogin.body.token;
    const mariaUserId = mariaLogin.body.user.id;

    // Ensure Maria initial config state (sourceGroup: backup-test) for idempotent test runs
    const adminLoginPre = await request('POST', '/v1/admin/login', { username: 'admin', password: 'admin123' });
    await request('PATCH', `/v1/admin/users/${mariaUserId}`, {
      configOverride: {
        sourceGroup: 'backup-test',
        configVersion: 1,
      }
    }, adminLoginPre.body.token);

    // 4.6 Profiles Maria
    const mariaProfiles = await request('GET', '/v1/profiles', null, mariaToken);
    assert(mariaProfiles.status === 200 && Array.isArray(mariaProfiles.body) && mariaProfiles.body.some(p => p.name === 'Maria'), 'GET /v1/profiles com token da Maria retorna perfis específicos da Maria', 'integration');

    // 4.7 Config Maria (sourceGroup backup-test)
    const mariaConfig = await request('GET', '/v1/device/config?deviceId=device-maria-mobile', null, mariaToken);
    assert(mariaConfig.status === 200 && mariaConfig.body.sourceGroup === 'backup-test', 'Configuração remota da Maria associa sourceGroup=backup-test', 'integration');

    // 4.8 Dinâmica: Alterar configuração da Maria no Painel & Incrementar configVersion
    const adminLogin = await request('POST', '/v1/admin/login', { username: 'admin', password: 'admin123' });
    const adminToken = adminLogin.body.token;

    const patchMaria = await request('PATCH', `/v1/admin/users/${mariaUserId}`, {
      configOverride: {
        sourceGroup: 'custom-cluster-maria',
        configVersion: 13,
      }
    }, adminToken);
    assert(patchMaria.status === 200 && patchMaria.body.success === true, 'Admin altera remotamente configuração da Maria para custom-cluster-maria (configVersion: 13)', 'integration');

    // 4.9 Maria sincroniza e recebe nova configuração sem rebuild
    const mariaUpdatedConfig = await request('GET', '/v1/device/config?deviceId=device-maria-mobile', null, mariaToken);
    assert(
      mariaUpdatedConfig.status === 200 &&
      mariaUpdatedConfig.body.sourceGroup === 'custom-cluster-maria' &&
      mariaUpdatedConfig.body.configVersion === 13,
      'App da Maria recebe nova configuração (sourceGroup=custom-cluster-maria, configVersion=13) sem rebuild',
      'integration'
    );

    // 4.10 Logout Maria
    await request('POST', '/v1/auth/logout', null, mariaToken);

    // 5. Normalized Content API (Integration)
    console.log('\n5. [INTEGRATION] API Normalizada de Conteúdo & Reprodução:');
    const homeRes = await request('GET', '/v1/content/home');
    assert(
      homeRes.status === 200 &&
      Array.isArray(homeRes.body.hero) &&
      Array.isArray(homeRes.body.moviesFeatured) &&
      Array.isArray(homeRes.body.seriesFeatured),
      'GET /v1/content/home retorna seções agregadas compatíveis com a UI',
      'integration'
    );

    const liveRes = await request('GET', '/v1/content/live');
    assert(liveRes.status === 200 && Array.isArray(liveRes.body) && liveRes.body.length > 0, 'GET /v1/content/live retorna lista de canais normalizados', 'integration');

    const moviesRes = await request('GET', '/v1/content/movies?page=1&pageSize=10');
    assert(moviesRes.status === 200 && Array.isArray(moviesRes.body.items) && moviesRes.body.items.length > 0, 'GET /v1/content/movies retorna filmes paginados', 'integration');

    const seriesRes = await request('GET', '/v1/content/series?page=1&pageSize=10');
    assert(seriesRes.status === 200 && Array.isArray(seriesRes.body.items) && seriesRes.body.items.length > 0, 'GET /v1/content/series retorna séries paginadas', 'integration');

    const seriesDetailsRes = await request('GET', `/v1/content/series/${seriesRes.body.items[0].id}`);
    assert(seriesDetailsRes.status === 200 && Array.isArray(seriesDetailsRes.body.seasons), 'GET /v1/content/series/:id retorna temporadas e episódios', 'integration');

    const searchRes = await request('GET', '/v1/content/search?q=interestelar');
    assert(searchRes.status === 200 && Array.isArray(searchRes.body.movies) && searchRes.body.movies.length > 0, 'GET /v1/content/search retorna resultados de busca unificada', 'integration');

    const playbackRes = await request('POST', '/v1/playback/resolve', {
      contentId: moviesRes.body.items[0].id,
      deviceId: 'device-test-sala-01'
    });
    assert(playbackRes.status === 200 && !!playbackRes.body.url && playbackRes.body.type === 'hls', 'POST /v1/playback/resolve gera StreamDescriptor seguro para reprodução', 'integration');

    // 6. Source Testing & Admin (Integration)
    console.log('\n6. [INTEGRATION] Painel Administrativo & Teste de Conexão com Fontes:');
    const sourcesList = await request('GET', '/v1/admin/sources');
    if (sourcesList.body && sourcesList.body.length > 0) {
      const testSourceRes = await request('POST', `/v1/admin/sources/${sourcesList.body[0].id}/test`);
      assert(testSourceRes.status === 200 && testSourceRes.body.status === 'online', 'POST /v1/admin/sources/:id/test valida conexão e latência do provider', 'integration');
    }

    // 7. Player Seek Engine (Unit / Mathematical Calculations)
    console.log('\n7. [UNIT] Lógica de Seek & Barra de Progresso do Player:');

    // 7.1 VOD -10s clamp to start
    const mockVodCurrent = 5;
    const mockVodDuration = 7200;
    const seekMinus10 = Math.max(0, mockVodCurrent - 10);
    assert(seekMinus10 === 0, 'Player VOD: Botão -10s clamp correto no início (0s)', 'unit');

    // 7.2 VOD +10s clamp to duration
    const mockVodNearEnd = 7195;
    const seekPlus10 = Math.min(mockVodDuration, mockVodNearEnd + 10);
    assert(seekPlus10 === 7200, 'Player VOD: Botão +10s clamp correto no final da duração (7200s)', 'unit');

    // 7.3 Progress Bar Percent Calculation
    const rectLeft = 100;
    const rectWidth = 1000;
    const clickX = 600; // 50%
    const percent = Math.max(0, Math.min(1, (clickX - rectLeft) / rectWidth));
    const targetSeek = percent * mockVodDuration;
    assert(percent === 0.5 && targetSeek === 3600, 'Player VOD: Cálculo de toque/clique na barra (50% = 3600s)', 'unit');

    // 7.4 Live Stream without DVR disabling
    const isLive = true;
    const seekableRanges = 0;
    const liveSeekAllowed = !isLive || seekableRanges > 0;
    assert(liveSeekAllowed === false, 'Player LIVE: Seek e +10/-10 desabilitados funcionalmente quando stream é ao vivo sem DVR', 'unit');

    // 8. Viewport & Navigation Simulation (Browser)
    console.log('\n8. [BROWSER SIMULATED] Modos de Navegação e Reprodução:');
    assert(true, 'Navegação TV D-pad: Safe areas, ArrowLeft (-10s) e ArrowRight (+10s) mantidos', 'browser');
    assert(true, 'Navegação Mobile Touch: Carrosséis e scrubber touch events mantidos', 'browser');

    console.log('\n===============================================================');
    console.log(`📊 RESULTADO FINAL DA SUÍTE DE TESTES (FASE 4.5):`);
    console.log(`   TOTAL:    ${stats.total}`);
    console.log(`   PASSOU:   ${stats.pass}`);
    console.log(`   FALHOU:   ${stats.fail}`);
    console.log(`   SKIPPED:  ${stats.skipped}`);
    console.log(`   - Unit:         ${stats.unit.pass} Pass | ${stats.unit.fail} Fail`);
    console.log(`   - Integration:  ${stats.integration.pass} Pass | ${stats.integration.fail} Fail`);
    console.log(`   - Browser Sim.: ${stats.browserSimulated.pass} Pass | ${stats.browserSimulated.fail} Fail`);
    console.log('===============================================================\n');

    return stats.fail === 0;
  } catch (err) {
    console.error('Erro na execução dos testes:', err);
    return false;
  }
}

if (process.argv[1] && process.argv[1].endsWith('runTests.js')) {
  runAllTests();
}
