import { Database } from "jsr:@db/sqlite@0.11";

const MIGRATIONS_TABLE = "migrations";
const MIGRATIONS_PATH = "database/migrations";

type MigrationRecord = {
  name: string;
  created_at: string;
};

type Migration = {
  name: string;
  createdAt: string;
};

// UTILS
async function fileToString(path: string): Promise<string> {
  const decoder = new TextDecoder("utf-8");
  const data = await Deno.readFile(path);

  return decoder.decode(data);
}

// MIGRATIONS TABLE QUERY
function tableExists(db: Database, tableName: string) {
  return db.sql`
    SELECT name FROM sqlite_master 
    WHERE type='${tableName}' AND name='{${tableName}}';
  `.length !== 0;
}

function getMigrations(db: Database): Migration[] {
  const stmt = db.prepare(`
    SELECT name, created_at FROM ${MIGRATIONS_TABLE}
  `);
  const rows = stmt.all<MigrationRecord>();

  return rows.map(({ name, created_at }) => ({ name, createdAt: created_at }));
}

function createMigrationsTable(db: Database) {
  return db.exec(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      name TEXT PRIMARY KEY,
      created_at TEXT NOT NULL
    );
  `);
}

function createMigration(db: Database, { name, createdAt }: Migration) {
  return db.exec(`
    INSERT INTO ${MIGRATIONS_TABLE}
      (name, created_at)
    VALUES ('${name}', '${createdAt}');
  `);
}

function deleteMigration(db: Database, name: string) {
  return db.exec(`
    DELETE FROM ${MIGRATIONS_TABLE}
    WHERE name = '${name}'
  `);
}

// MIGRATIONS SINGLE
function runMigrationUp(db: Database, sql: string, name: string) {
  const runTransaction = db.transaction(() => {
    db.exec(sql);
    const createdCount = createMigration(db, {
      name,
      createdAt: Date.now().toString(),
    });
    if (!createdCount) {
      throw Error(`Could not create migration: ${name}`);
    }
  });
  runTransaction();
}

function runMigrationDown(db: Database, sql: string, name: string) {
  const runTransaction = db.transaction(() => {
    db.exec(sql);
    const deletedCount = deleteMigration(db, name);
    if (!deletedCount) {
      throw Error(`Could not delete migration: ${name}`);
    }
  });
  runTransaction();
}

// IO
async function getMigrationsToRun(
  db: Database,
): Promise<{ sql: string; name: string }[]> {
  const files = [];
  const migrationNames = getMigrations(db).map((m) => m.name);

  for await (const file of Deno.readDir(MIGRATIONS_PATH)) {
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
    const p = `${MIGRATIONS_PATH}/${f.name}`;
    const sql = await fileToString(p);
    migrationsToRun.push({
      sql,
      name: f.name.replace(".up.sql", ""),
    });
  }

  return migrationsToRun;
}

async function rollbackFromName(db: Database, name: string) {
  const sql = await fileToString(
    `${MIGRATIONS_PATH}/${name}.down.sql`,
  );
  if (!sql) {
    console.error("Could not find migration file for :", name);
    return;
  }

  console.log(`Rolling back ${name}`);
  runMigrationDown(db, sql, name);
}

export async function rollbackOne(db: Database) {
  const [lastMigration] = getMigrations(db).reverse();

  if (!lastMigration) {
    console.log("No migration to rollback.");
    return;
  }

  await rollbackFromName(db, lastMigration.name);
}

export async function rollbackAll(db: Database) {
  const migrations = getMigrations(db).reverse();

  if (!migrations.length) {
    console.log("No migrations to run.");
    return;
  }

  for (const migration of migrations) {
    await rollbackFromName(db, migration.name);
  }
}

export async function migrateOne(db: Database) {
  if (!tableExists(db, MIGRATIONS_TABLE)) {
    createMigrationsTable(db);
  }
  const [migrationToRun] = await getMigrationsToRun(db);
  if (!migrationToRun) {
    console.log("No migration to run.");
    return;
  }

  console.log(`Found migration to run.`);
  console.log(`Running migration: ${migrationToRun.name}`);
  runMigrationUp(db, migrationToRun.sql, migrationToRun.name);
  console.log(`Successfully migrated.`);
}

export async function migrateAll(db: Database) {
  if (!tableExists(db, MIGRATIONS_TABLE)) {
    createMigrationsTable(db);
  }

  const migrationsToRun = await getMigrationsToRun(db);
  if (!migrationsToRun.length) {
    console.log("No migrations to run.");
    return;
  }

  console.log(`Found migrations to run.`);
  for (const migrationToRun of migrationsToRun) {
    console.log(`Running migration: ${migrationToRun.name}`);
    runMigrationUp(db, migrationToRun.sql, migrationToRun.name);
  }
  console.log(`Successfully migrated.`);
}
