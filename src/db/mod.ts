/**
 * Contains functionality for dealing with databases.
 *
 * # Example
 *
 * ```ts
 * import { db, migrations } from "@aburd/rove";
 *
 * const connection = db.connect({
 *   dbPath: "resources/test.db",
 *   sqlType: "sqlite3",
 * });
 *
 * // Runs a single migration
 * migrations.migrateOne(connection.db, "migrations");
 * // Run the next migration
 * migrations.migrateOne(connection.db, "migrations");
 * // Run all remaining migrations
 * migrations.migrateAll(connection.db, "migrations");
 * // Rollback the last migration
 * migrations.rollbackOne(connection.db, "migrations");
 * // Rollback all migrations
 * migrations.rollbackAll(connection.db, "migrations");
 * ```
 *
 * @module
 */
import type { Connection, SqlType } from "./types.ts";
import * as sqlite from "./sqlite.ts";

export * from "./types.ts";

/**
 * Options for the connect function
 */
export type ConnectOpts = {
  dbPath: string;
  sqlType: SqlType;
};

/**
 * Connect to an instance of a DB of a certain type
 */
export function connect(connectOpts: ConnectOpts): Connection {
  if (connectOpts.sqlType === "sqlite3") {
    return sqlite.getConnection(connectOpts.dbPath);
  }

  throw new Error(`Unsupported DB type ${connectOpts.sqlType} given`);
}
