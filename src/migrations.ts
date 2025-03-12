import type { DB } from "./db/types.ts";
import { fileToString } from "./util.ts";

type MigrationRecord = {
  name: string;
  created_at: string;
};

type Migration = {
  name: string;
  createdAt: string;
};

const DEFAULT_MIGRATIONS_TABLE = "migrations";

// MIGRATIONS TABLE QUERY
function tableExists(db: DB, tableName: string) {
  return db.sql(
    `
    SELECT name FROM sqlite_master 
    WHERE type = :type AND name = :name;
  `,
    { type: tableName, name: tableName },
  ).length !== 0;
}

function getMigrations(db: DB, migrationsTable: string): Migration[] {
  const rows = db.sql<MigrationRecord>(`
    SELECT name, created_at FROM ${migrationsTable}
  `);

  return rows.map(({ name, created_at }) => ({ name, createdAt: created_at }));
}

function createMigrationsTable(db: DB, migrationsTable: string) {
  const sql = `
    CREATE TABLE IF NOT EXISTS ${migrationsTable} (
      name TEXT PRIMARY KEY,
      created_at TEXT NOT NULL
    );
  `;
  return db.exec(sql);
}

function createMigration(
  db: DB,
  migrationsTable: string,
  { name, createdAt }: Migration,
) {
  return db.exec(
    `
    INSERT INTO ${migrationsTable}
      (name, created_at)
    VALUES (:name, :createdAt);
  `,
    { name, createdAt },
  );
}

function deleteMigration(db: DB, migrationsTable: string, name: string) {
  return db.exec(
    `
    DELETE FROM ${migrationsTable}
    WHERE name = :name
  `,
    { name },
  );
}

// MIGRATIONS SINGLE
function runMigrationUp(
  db: DB,
  migrationsTable: string,
  sql: string,
  name: string,
) {
  db.transaction(() => {
    db.exec(sql);
    const createdCount = createMigration(db, migrationsTable, {
      name,
      createdAt: Date.now().toString(),
    });
    if (!createdCount) {
      throw Error(`Could not create migration: ${name}`);
    }
  });
}

function runMigrationDown(
  db: DB,
  migrationsTable: string,
  sql: string,
  name: string,
) {
  db.transaction(() => {
    db.exec(sql);
    const deletedCount = deleteMigration(db, migrationsTable, name);
    if (!deletedCount) {
      throw Error(`Could not delete migration: ${name}`);
    }
  });
}

// IO
async function getMigrationsToRun(
  db: DB,
  migrationsTable: string,
  migrationsPath: string,
): Promise<{ sql: string; name: string }[]> {
  const files = [];
  const migrationNames = getMigrations(db, migrationsTable).map((m) => m.name);

  for await (const file of Deno.readDir(migrationsPath)) {
    if (file.isFile && file.name.endsWith("up.sql")) {
      files.push(file);
    }
  }

  const filtered = files.filter((f) =>
    !migrationNames.includes(f.name.replace(".up.sql", ""))
  ).sort((a, b) => {
    if (a.name > b.name) return 1;
    if (a.name < b.name) return -1;
    return 0;
  });
  const migrationsToRun = [];
  for (const f of filtered) {
    const p = `${migrationsPath}/${f.name}`;
    const sql = await fileToString(p);
    migrationsToRun.push({
      sql,
      name: f.name.replace(".up.sql", ""),
    });
  }

  return migrationsToRun;
}

async function rollbackFromName(
  db: DB,
  migrationsTable: string,
  migrationsPath: string,
  name: string,
) {
  const sql = await fileToString(
    `${migrationsPath}/${name}.down.sql`,
  );
  if (!sql) {
    console.error("Could not find migration file for :", name);
    return;
  }

  console.log(`Rolling back ${name}`);
  runMigrationDown(db, migrationsTable, sql, name);
}

export async function rollbackOne(
  db: DB,
  /** path to defaults to where this command is run */
  migrationsPath: string = Deno.cwd(),
  /** path to defaults to 'migrations' */
  migrationsTable: string = DEFAULT_MIGRATIONS_TABLE,
) {
  const [lastMigration] = getMigrations(db, migrationsTable).reverse();

  if (!lastMigration) {
    console.log("No migration to rollback.");
    return;
  }

  await rollbackFromName(
    db,
    migrationsTable,
    migrationsPath,
    lastMigration.name,
  );
}

export async function rollbackAll(
  db: DB,
  /** path to defaults to where this command is run */
  migrationsPath: string = Deno.cwd(),
  /** path to defaults to 'migrations' */
  migrationsTable: string = DEFAULT_MIGRATIONS_TABLE,
) {
  const migrations = getMigrations(db, migrationsTable).reverse();

  if (!migrations.length) {
    console.log("No migrations to run.");
    return;
  }

  for (const migration of migrations) {
    await rollbackFromName(db, migrationsTable, migrationsPath, migration.name);
  }
}

export async function migrateOne(
  db: DB,
  /** path to defaults to where this command is run */
  migrationsPath: string = Deno.cwd(),
  /** path to defaults to 'migrations' */
  migrationsTable: string = DEFAULT_MIGRATIONS_TABLE,
) {
  if (!tableExists(db, migrationsTable)) {
    createMigrationsTable(db, migrationsTable);
  }
  const [migrationToRun] = await getMigrationsToRun(
    db,
    migrationsTable,
    migrationsPath,
  );
  if (!migrationToRun) {
    console.log("No migration to run.");
    return;
  }

  console.log(`Found migration to run.`);
  console.log(`Running migration: ${migrationToRun.name}`);
  runMigrationUp(db, migrationsTable, migrationToRun.sql, migrationToRun.name);
  console.log(`Successfully migrated.`);
}

export async function migrateAll(
  db: DB,
  /** path to defaults to where this command is run */
  migrationsPath: string = Deno.cwd(),
  /** path to defaults to 'migrations' */
  migrationsTable: string = DEFAULT_MIGRATIONS_TABLE,
) {
  if (!tableExists(db, migrationsTable)) {
    createMigrationsTable(db, migrationsTable);
  }

  const migrationsToRun = await getMigrationsToRun(
    db,
    migrationsTable,
    migrationsPath,
  );
  if (!migrationsToRun.length) {
    console.log("No migrations to run.");
    return;
  }

  console.log(`Found migrations to run.`);
  for (const migrationToRun of migrationsToRun) {
    console.log(`Running migration: ${migrationToRun.name}`);
    runMigrationUp(
      db,
      migrationsTable,
      migrationToRun.sql,
      migrationToRun.name,
    );
  }
  console.log(`Successfully migrated.`);
}
