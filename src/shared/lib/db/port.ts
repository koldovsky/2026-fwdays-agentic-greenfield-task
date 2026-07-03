// Driver-agnostic database port. Repositories depend on this interface, never on
// a concrete driver, so the runtime engine (node-postgres, kysely, …) is a single
// swappable adapter and repos stay unit-testable against an in-memory fake.
//
// The shape intentionally matches node-postgres' `client.query(text, params)` so a
// `pg` adapter is a near-passthrough; other drivers wrap trivially.

export interface QueryResult<Row> {
  readonly rows: readonly Row[];
}

export interface Queryable {
  /** Execute a parameterized SQL statement ($1, $2, …) and return typed rows. */
  query<Row>(sql: string, params?: readonly unknown[]): Promise<QueryResult<Row>>;
}
