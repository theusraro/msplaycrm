import { db } from '../database/db.js';
import { hashPassword } from '../auth/crypto.js';

async function seedDev() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Proibido executar seed de desenvolvimento em ambiente de produção (NODE_ENV=production).');
    process.exit(1);
  }

  await db.init();
  console.info('🌱 Executando seed de desenvolvimento...');

  // Test User
  const testUser = await db.getUserByUsername('teste');
  if (!testUser) {
    const { hash, salt, iterations } = hashPassword('1234');
    await db.createUser({
      username: 'teste',
      passwordHash: hash,
      salt,
      iterations,
      status: 'active',
      expiresAt: null,
      maxDevices: 3,
    });
    console.info('  + Usuário teste / 1234 criado.');
  }

  // Admin User
  const adminUser = await db.getUserByUsername('admin');
  if (!adminUser) {
    const { hash, salt, iterations } = hashPassword('admin123');
    await db.createUser({
      username: 'admin',
      passwordHash: hash,
      salt,
      iterations,
      status: 'active',
      expiresAt: null,
      maxDevices: 10,
    });
    console.info('  + Usuário admin / admin123 criado.');
  }

  console.info('✅ Seed de desenvolvimento concluído com sucesso.');
  await db.close();
}

seedDev().catch(err => {
  console.error('❌ Falha no seed de desenvolvimento:', err);
  process.exit(1);
});
