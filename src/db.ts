import { Database } from "@db/sqlite";

type Connection = {
  db: Database;
  [Symbol.dispose]: () => void;
};

/**
 * Can be used with the `using` keyword for quick and dirty access
 */
export function getConnection(dbPath: string): Connection {
  const db = new Database(dbPath);
  return {
    db,
    [Symbol.dispose]: () => {
      db.close();
    },
  };
}

let db: Database;

/**
 * Get a singleton reference to the db
 */
export function getDb(dbPath: string): Database {
  if (!db) {
    db = new Database(dbPath);
  }

  return db;
}

/**
 * Close the singleton reference to the db
 */
export function closeDb(): void {
  if (db) {
    db.close();
  }
}
