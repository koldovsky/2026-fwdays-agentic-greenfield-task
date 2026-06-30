// Multi-tenancy helpers (invariant #8). Service-layer convention: every domain query builds its
// `where` through one of these so the `user_id` filter isn't forgotten. Enforcement is by
// convention + the review gate (only our backend touches the DB, so no Postgres RLS); a Prisma
// `$extends`/middleware choke-point can make it structural later if queries start bypassing these.

interface CatalogScope {
  OR: ({ userId: number } | { userId: null })[];
}

/** Scope a domain `where` to a single tenant by injecting `userId` (spread last — the tenant wins). */
export const tenantWhere = <T extends object>(
  userId: number,
  where?: T,
): T & { userId: number } => ({
  ...(where ?? ({} as T)),
  userId,
});

/**
 * Scope a `food_database` read to the tenant's own rows plus the global catalog (`user_id IS NULL`).
 * Nested under `AND` so a caller's own filter (including its own `OR`) is preserved, never clobbered.
 * Writes use {@link tenantWhere}; only catalog reads widen to include globals.
 */
export const catalogWhere = <T extends object>(
  userId: number,
  where?: T,
): { AND: (T | CatalogScope)[] } => {
  const scope: CatalogScope = { OR: [{ userId }, { userId: null }] };

  return { AND: where ? [where, scope] : [scope] };
};
