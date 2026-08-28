import { db } from '../database/db.js';
import { hashPassword } from '../auth/crypto.js';

async function createAdmin() {
  const username = process.env.ADMIN_USERNAME || process.argv[2];
  const password = process.env.ADMIN_PASSWORD || process.argv[3];

  if (!username || !password) {
    console.error('❌ Uso obrigatório: node server/dist/cli/createAdmin.js <username> <password>');
    console.error('Ou defina as variáveis de ambiente ADMIN_USERNAME e ADMIN_PASSWORD.');
    process.exit(1);
  }

  await db.init();

  const existing = await db.getUserByUsername(username);
  if (existing) {
    console.error(`❌ O usuário "${username}" já existe na base.`);
    process.exit(1);
  }

  const { hash, salt, iterations } = hashPassword(password);

  const adminUser = await db.createUser({
    username,
    passwordHash: hash,
    salt,
    iterations,
    status: 'active',
    expiresAt: null,
    maxDevices: 20,
  });

  await db.logAudit({
    actor: 'CLI_BOOTSTRAP',
    action: 'CREATE_INITIAL_ADMIN',
    targetType: 'user',
    targetId: adminUser.id,
    metadata: { username: adminUser.username },
  });

  console.info(`✅ Administrador "${username}" criado com sucesso no banco de dados!`);
  await db.close();
}

createAdmin().catch((err: any) => {
  console.error('❌ Falha ao criar administrador:', err.message);
  process.exit(1);
});
