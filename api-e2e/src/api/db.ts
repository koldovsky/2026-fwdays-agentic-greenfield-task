import 'dotenv/config';
import * as mariadb from 'mariadb';

// Direct DB access for test fixtures the API deliberately refuses to
// expose (expired codes, daily-limit history) — design D-risk: TTL/expiry
// cases manipulate otp_code rows instead of waiting out real clocks.
let pool: mariadb.Pool | undefined;

function getPool(): mariadb.Pool {
  if (!pool) {
    const url = new URL(
      process.env.DATABASE_URL ??
        'mysql://servicedesk:servicedesk@localhost:3306/servicedesk',
    );
    pool = mariadb.createPool({
      host: url.hostname,
      port: url.port ? Number(url.port) : 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ''),
      allowPublicKeyRetrieval: true,
      connectionLimit: 2,
    });
  }
  return pool;
}

export function dbQuery<T = unknown>(
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  return getPool().query({ sql, bigIntAsNumber: true }, params);
}

export async function dbClose(): Promise<void> {
  await pool?.end();
  pool = undefined;
}
