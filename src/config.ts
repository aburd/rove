import * as path from "@std/path";
import { exists } from "@std/fs";
import type { SqlType } from "./db/types.ts";
import { fileToString } from "./util.ts";

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

const customConfigPath = path.join(Deno.cwd(), "rove.json");

/**
 * Get Rove config if it exists, this is for convenience
 * and it is not necessary as you can configure everything
 * through the CLI
 */
export async function getRoveConfig(): Promise<RoveConfig> {
  // check custom config path
  if (await exists(customConfigPath)) {
    const configJson = await fileToString(customConfigPath);
    try {
      const potentialConfig = JSON.parse(configJson);

      return {
        ...DEFAULT_CONFIG,
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
    return {
      dbPath,
      sqlType: sqlType as SqlType ?? DEFAULT_CONFIG.sqlType,
      migrationsDir: migrationsDir ?? DEFAULT_CONFIG.migrationsDir,
      migrationsTable: migrationsTable ?? DEFAULT_CONFIG.migrationsTable,
    };
  }

  return DEFAULT_CONFIG;
}

// console.log(await getRoveConfig())
