/**
 * Contains functionality for dealing with databases.
 *
 * # Example
 *
 * ```ts
 * import { db } from "@aburd/rove";
 *
 * const connection = db.connect({
 *   dbPath: "resources/test.db",
 *   sqlType: "sqlite3",
 * });
 *
 * migrations.migrateOne(connection.db, "migrations");
 * ```
 *
 * @module
 */
import type { Connection, SqlType } from "./types.ts";
import * as sqlite from "./sqlite.ts";

export * from "./types.ts";

type ConnectOpts = {
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
