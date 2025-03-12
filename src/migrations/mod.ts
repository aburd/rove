/**
 * Contains all functionality related to migrations.
 * For example creating migration files, running migrations, or rolling them back.
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
 * import { connect, migrations } from "jsr:@aburd/rove";
 * ```
 *
 * @module
 */
export * from "./createMigrationFiles.ts";
export * from "./migrateAndRollback.ts";
