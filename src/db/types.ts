/**
 * All types related to DB interface, the interface hides different flavors of SQL
 *
 * @module database
 */

/**
 * A connection to the database, implements dispose interface to be used with typescript `using` keyword to a SQL database
 */
export type Connection = {
  db: DB;
  [Symbol.dispose]: () => void;
};

/**
 * Types of databases we support
 */
export type SqlType = "sqlite3";

/**
 * Parameters for SQL queries that will be sanitized
 */
export type BindParams = Record<string, string>;
/**
 * Rows from an SQL database
 */
export type Row = Record<string, any>;

/**
 * An interface for interacting with a concrete implementation
 * of a database
 */
export interface DB {
  /** close the database connection safely */
  closeDb(): void;
  /**
   * execute sql, can execute multiple statements
   * @param sql the sql string
   * @param sql an array of bind params, each statement will be fed the params in the position of the array
   * @returns number the number of affected rows
   */
  exec(sql: string, bindParams?: BindParams[]): number;
  /**
   * execute sql but return the rows
   * you can only execute a single statement
   */
  sql<R extends object = Row>(sql: string, bindParams?: BindParams): R[];
  /**
   * Wrap sql statements in a transaction
   * Will rollback on throw
   */
  transaction(cb: () => void): void;
}
