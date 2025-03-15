import type { DB } from "./db/types.ts";

/**
 * Gets a file to string as utf-8
 * @param path A path to the file
 */
export async function fileToString(path: string): Promise<string> {
  const decoder = new TextDecoder("utf-8");
  const data = await Deno.readFile(path);

  return decoder.decode(data);
}

export function tableExists(db: DB, tableName: string) {
  return db.sql(
    `
    SELECT name FROM sqlite_master 
    WHERE type = 'table' AND name = :name
    ;
  `,
    { name: tableName },
  ).length !== 0;
}

export function isEmptyOrWhitespace(s: string): boolean {
  if (!s) {
    return true;
  }

  return !!/^\s+$/.exec(s);
}
