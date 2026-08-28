import { performance } from 'node:perf_hooks';
import { hashPassword, verifyPassword, PASSWORD_HASH_ITERATIONS, PASSWORD_HASH_ALGORITHM } from '../../dist/auth/crypto.js';

export function runBenchmark(samples = 5) {
  console.log(`\n⚡ Executando Benchmark de Hashing (${PASSWORD_HASH_ALGORITHM}, ${PASSWORD_HASH_ITERATIONS.toLocaleString()} iterações)...`);
  const password = 'ExemploSenhaSegura123!';

  // Measure hashPassword
  const hashTimes = [];
  let lastResult = null;
  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    lastResult = hashPassword(password);
    hashTimes.push(performance.now() - start);
  }
  const avgHash = hashTimes.reduce((a, b) => a + b, 0) / hashTimes.length;

  // Measure verifyPassword
  const verifyTimes = [];
  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    verifyPassword(password, lastResult.hash, lastResult.salt, lastResult.iterations);
    verifyTimes.push(performance.now() - start);
  }
  const avgVerify = verifyTimes.reduce((a, b) => a + b, 0) / verifyTimes.length;

  console.log(`   Tempo médio hashPassword():   ${avgHash.toFixed(2)} ms`);
  console.log(`   Tempo médio verifyPassword(): ${avgVerify.toFixed(2)} ms`);
  console.log(`   Status de Calibração:          ${avgHash < 300 ? '✅ Adequado para Produção (< 300ms)' : '⚠️ Custo elevado'}\n`);

  return { avgHash, avgVerify };
}

if (process.argv[1] && process.argv[1].endsWith('benchmarkHash.js')) {
  runBenchmark(10);
}
