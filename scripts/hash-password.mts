// Print a scrypt password hash for the HR account (FR-AUTH-02). The plaintext
// is never stored or transmitted — only the printed hash goes into HrUser.
//
//   node scripts/hash-password.mts "<password>"
//
// Copy the output into HrUser.passwordHash (or use scripts/create-hr-user.mts).
import { hashPassword } from "../lib/auth/password.ts";

const password = process.argv[2];
if (password === undefined || password.length === 0) {
  console.error('usage: node scripts/hash-password.ts "<password>"');
  process.exit(1);
}

console.log(hashPassword(password));
