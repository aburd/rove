import type { SqlType, Connection} from './types.ts'
import * as sqlite from './sqlite.ts'

export type ConnectOpts = {
  dbPath: string;
  type: SqlType;
}

/** connect to the DB */
export function connect(connectOpts: ConnectOpts): Connection {
  if (connectOpts.type === 'sqlite3') {
    return sqlite.getConnection(connectOpts.dbPath);
  }

  throw new Error(`Unsupported DB type ${connectOpts.type} given`);
}
