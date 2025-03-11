import type { DB, Connection, BindParams, Row } from "./types.ts";
import { Database } from "@db/sqlite";

let db: DB;

/**
 * Can be used with the `using` keyword for quick and dirty access
 */
export function getConnection(dbPath: string): Connection {
  const sqlite3Db = new Database(dbPath);

  db = {
    getDb() {
      return db;
    },
    closeDb() {
      sqlite3Db.close();
    },
    exec(sql, bindParams) {
      return sqlite3Db.exec(sql, bindParams);
    },
    sql: function<R extends object = Row>(sqlS: string, bindParams: BindParams) {
      const stmt = sqlite3Db.prepare(sqlS);
      const rows = stmt.all<R>(bindParams);

      return rows;
    },
    transaction(cb) {
      const transaction = sqlite3Db.transaction(() => {
        cb();
      });
      transaction();
    }
  }

  return {
    db,
    [Symbol.dispose]: () => {
      sqlite3Db.close();
    },
  };
}
