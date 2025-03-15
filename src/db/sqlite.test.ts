import { getConnection } from "./sqlite.ts";
import { exists } from "@std/fs";
import { assertEquals } from "@std/assert";

const TEST_DB_PATH = "resources/test.db";

Deno.test("exec can use multiple statements", async () => {
  if (await exists(TEST_DB_PATH)) {
    Deno.removeSync(TEST_DB_PATH);
  }
  using connection = getConnection(TEST_DB_PATH);

  connection.db.exec(`
    create table if not exists foo (
      id integer primary key,
      name text not null
    );
  `);
  const rowsAffected = connection.db.exec(`
    insert into foo (name) values ('yes');
    insert into foo (name) values ('sir');
  `);

  assertEquals(rowsAffected, 2);

  const rows = connection.db.sql(`
    select name from foo;
  `);

  assertEquals(rows, [{ name: "yes" }, { name: "sir" }]);
});
