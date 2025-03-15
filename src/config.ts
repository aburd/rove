/**
 * Contains all functions for getting Rove configurations.
 * This function is mostly for usage with the CLI, but you could use it if you needed to.
 *
 * # Example
 *
 * ```ts
 * import { config } from "jsr:@aburd/rove";
 *
 * const config = await config.getRoveConfig();
 * ```
 *
 * @module
 */
import * as path from "@std/path";
import { exists } from "@std/fs";
import type { SqlType } from "./db/types.ts";
import { fileToString } from "./util.ts";

/**
 * Base configuration for Rove, mostly for usage with CLI
 */
export type RoveConfig = {
  sqlType: SqlType;
  dbPath?: string;
  /** will default to 'migrations' */
  migrationsDir: string;
  /** will default to 'migrations' */
  migrationsTable: string;
};

const DEFAULT_CONFIG: RoveConfig = {
  migrationsDir: "migrations",
  migrationsTable: "migrations",
  sqlType: "sqlite3",
};

const DEFAULT_CONFIG_PATH = "rove.json";

/**
 * Get Rove config
 * If a config file exists, overwrite any options from config file
 * If environment variables from shell exist, overwrite
 */
export async function getRoveConfig(configPath?: string): Promise<RoveConfig> {
  const customConfigPath = path.join(
    Deno.cwd(),
    configPath ?? DEFAULT_CONFIG_PATH,
  );
  let config = DEFAULT_CONFIG;

  // check custom config path
  if (await exists(customConfigPath)) {
    const configJson = await fileToString(customConfigPath);
    try {
      const potentialConfig = JSON.parse(configJson);

      config = {
        ...config,
        ...potentialConfig,
      };
    } catch (_) {
      console.warn(
        `Could not parse rove config at ${customConfigPath}, potential issues.`,
      );
    }
  }

  // next check env vars
  const dbPath = Deno.env.get("DB_PATH");
  const sqlType = Deno.env.get("DB_TYPE");
  const migrationsDir = Deno.env.get("MIGRATION_DIR");
  const migrationsTable = Deno.env.get("MIGRATION_TABLE");

  if (dbPath) {
    config.dbPath = dbPath;
  }
  if (sqlType) {
    config.sqlType = sqlType as SqlType;
  }
  if (migrationsDir) {
    config.migrationsDir = migrationsDir;
  }
  if (migrationsTable) {
    config.migrationsTable = migrationsTable;
  }

  return config;
}
