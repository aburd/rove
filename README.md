## Rove

A simple SQL migrations library and CLI for deno written in typescript.

For now, it only supports sqlite3, but I plan to support to other flavors as the need arises.

### In a nutshell

Rove will:

- Create up and down SQL migration files for you
- Run those migration files and persist them to a database table
- Allow you to roll them back as necessary

## As a library

```typescript
import { connect } from "@aburd/rove";

const connection = connect({
  dbPath: "resources/test.db",
  type: "sqlite3",
});

// Runs a single migration
migrations.migrateOne(connection.db, action.dir);
// Run the next migration
migrations.migrateOne(connection.db, action.dir);
// Run all remaining migrations
migrations.migrateAll(connection.db, action.dir);
// Rollback the last migration
migrations.rollbackOne(connection.db, "migrations");
// Rollback all migrations
migrations.rollbackAll(connection.db, action.dir);
```

## As a cli

The above comes with a CLI which is configurable.

```
deno run jsr:@aburd/rove/cli
```

The options are all well documented through the help option, so please consult that.

```
deno run jsr:@aburd/rove/cli help
deno run jsr:@aburd/rove/cli create -h
deno run jsr:@aburd/rove/cli migrate -h
```

You may need read and write permissions as necessary.

```
deno run --allow-read --allow-write jsr:@aburd/rove/cli create --name my_new_migration
```

### Configuration

rove.json

```
{
  dbPath: "resources/my.db",
  type: "sqlite3",
}
```

Using environment variables

```
DB_PATH=resources/my.db
DB_TYPE=SQLITE3
```
