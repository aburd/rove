/**
 * Types related to DB functionality
 *
 * @module
 */

/**
 * A connection to a SQL database
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
  /** get the db instance */
  getDb(): DB;
  /** close the database connection safely */
  closeDb(): void;
  /** exec some sql, return the number of affected rows */
  exec(sql: string, bindParams?: BindParams): number;
  /** give some sql and some bind parameters */
  sql<R extends object = Row>(sql: string, bindParams?: BindParams): R[];
  /** just rollsback on throw */
  transaction(cb: () => void): void;
}
