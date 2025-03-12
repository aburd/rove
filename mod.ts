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
export * as migrations from "./src/migrations/mod.ts";
export * from "./src/db/mod.ts";
export * as config from "./src/config.ts";
