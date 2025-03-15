import { isEmptyOrWhitespace } from "../util.ts";
import type { BindParams, Connection, DB, Row } from "./types.ts";
import { Database } from "@db/sqlite";

let connection: Connection;

function getDb(dbPath: string): DB {
  const sqlite3Db = new Database(dbPath);

  return {
    closeDb() {
      sqlite3Db.close();
    },
    exec(sql, bindParams = []) {
      let rowsAffected = 0;
      // We avoid using the underlying C API directly in sqlite driver
      // because it leads to problems, always feed some kind of params for consistent behavior
      const sqlStrings = sql.split(";").filter((s) => !isEmptyOrWhitespace(s));
      for (let i = 0; i < sqlStrings.length; i++) {
        const params = bindParams[i];
        const sqlS = sqlStrings[i] + ";";
        rowsAffected += sqlite3Db.exec(sqlS, params);
      }

      return rowsAffected;
    },
    sql: function <R extends object = Row>(
      sqlS: string,
      bindParams: BindParams,
    ) {
      const stmt = sqlite3Db.prepare(sqlS);
      const rows = stmt.all<R>(bindParams);

      return rows;
    },
    transaction(cb) {
      const transaction = sqlite3Db.transaction(cb);
      return transaction();
    },
  };
}

/**
 * Can be used with the `using` keyword for quick and dirty access
 */
export function getConnection(dbPath: string): Connection {
  if (!connection) {
    connection = {
      db: getDb(dbPath),
      [Symbol.dispose]: () => {
        connection.db.closeDb();
      },
    };
  }

  return connection;
}
