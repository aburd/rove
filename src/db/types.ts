export type Connection = {
  db: DB;
  [Symbol.dispose]: () => void;
};

export type SqlType = "sqlite3";

export type BindParams = Record<string, string>;
export type Row = Record<string, any>;

export interface DB {
  /** get the db instance */
  getDb(): DB;
  /** close the database connection safely */
  closeDb(): void;
  /** exec some sql, return the number of affected rows */
  exec(sql: string, bindParams: BindParams): number;
  /** give some sql and some bind parameters */
  sql<R extends object = Row>(sql: string, bindParams: BindParams): R[]; 
  /** just rollsback on throw */
  transaction(cb: () => void): void;
}
