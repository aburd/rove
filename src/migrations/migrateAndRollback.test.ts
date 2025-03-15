import { assert } from "@std/assert";
import * as sut from "./migrateAndRollback.ts";
import { connect } from "../db/mod.ts";
import * as path from "@std/path";
import type { DB } from "../db/types.ts";

function tableExists(db: DB, tableName: string) {
  return db.sql(
    `
    SELECT name FROM sqlite_master 
    WHERE type = 'table' AND name = :name
    ;
  `,
    { name: tableName },
  ).length !== 0;
}

const migration1Table = ["users", "events", "event_users"];
const migration2Table = ["foo", "bar", "baz"];

Deno.test("can migrate and rollback", async (t) => {
  await Deno.remove("resources/test.db");
  const connection = connect({
    dbPath: path.join(Deno.cwd(), "resources/test.db"),
    sqlType: "sqlite3",
  });

  await t.step("can migrate one", async () => {
    await sut.migrateOne(connection.db, "resources");

    migration1Table.forEach((t) => assert(tableExists(connection.db, t)));
  });

  await t.step("can rollback one", async () => {
    await sut.rollbackOne(connection.db, "resources");

    migration1Table.forEach((t) => assert(!tableExists(connection.db, t)));
  });

  await t.step("can migrate all", async () => {
    await sut.migrateAll(connection.db, "resources");

    migration1Table.concat(migration2Table).forEach((t) =>
      assert(tableExists(connection.db, t))
    );
  });

  await t.step("can rollback all", async () => {
    await sut.rollbackAll(connection.db, "resources");

    migration1Table.concat(migration2Table).forEach((t) =>
      assert(!tableExists(connection.db, t))
    );
  });
});
