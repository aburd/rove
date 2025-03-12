import type { Connection, SqlType } from "./types.ts";
import * as sqlite from "./sqlite.ts";

export type ConnectOpts = {
  dbPath: string;
  sqlType: SqlType;
};

/** connect to the DB */
export function connect(connectOpts: ConnectOpts): Connection {
  if (connectOpts.sqlType === "sqlite3") {
    return sqlite.getConnection(connectOpts.dbPath);
  }

  throw new Error(`Unsupported DB type ${connectOpts.sqlType} given`);
}
