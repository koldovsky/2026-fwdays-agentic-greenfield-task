// Provision the single HR account (FR-AUTH-02): hash the password and upsert
// the HrUser row by email. Run by an administrator, not exposed in the app.
//
//   node scripts/create-hr-user.mts <email> "<password>" ["Name"]
//
// Env (DATABASE_URL) is loaded from .env / .env.local first, the same way
// prisma.config.ts does, before the DB client is imported.
for (const file of [".env", ".env.local"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // file absent — fine
  }
}

const [email, password, name] = process.argv.slice(2);
if (email === undefined || password === undefined) {
  console.error('usage: node scripts/create-hr-user.ts <email> "<password>" ["Name"]');
  process.exit(1);
}

// Dynamic imports so process.loadEnvFile runs before lib/db reads DATABASE_URL.
const { db } = await import("../lib/db/index.ts");
const { hashPassword } = await import("../lib/auth/password.ts");

const passwordHash = hashPassword(password);
const user = await db.hrUser.upsert({
  where: { email },
  update: { passwordHash, name: name ?? null },
  create: { email, passwordHash, name: name ?? null },
});

console.log(`HrUser ready: ${user.id} <${user.email}>`);
await db.$disconnect();
