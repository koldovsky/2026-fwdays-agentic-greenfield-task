// Phone normalization (FR-AUTH-01, design D10): accepted inputs are
// 0XXXXXXXXX, 380XXXXXXXXX, +380XXXXXXXXX (spaces/dashes/parens ignored);
// the canonical form +380XXXXXXXXX is the unique user key and the
// rate-limit key, independent of UI input masks.
export function normalizePhone(input: string): string | null {
  const compact = input.replace(/[\s\-()]/g, '');
  const match = /^(?:\+?380|0)(\d{9})$/.exec(compact);
  return match ? `+380${match[1]}` : null;
}

// For log lines: full phone numbers must not appear in logs (NFR-SEC-01).
export function maskPhone(phone: string): string {
  return phone.length > 6 ? `${phone.slice(0, 4)}*****${phone.slice(-2)}` : '*';
}
