import { parseArgs } from "@std/cli";
import { createMigrationFiles } from "../src/createMigrationFiles.ts";
import * as migrations from "../src/migrations.ts";
import { connect } from "../src/db/mod.ts";
import { getRoveConfig, type RoveConfig } from "../src/config.ts";
import type { SqlType } from "../src/db/types.ts";
import * as path from "@std/path";

type Arg = {
  name: string;
  short?: string;
  description: string;
  type: "string";
  required?: boolean;
  default?: string;
} | {
  name: string;
  short?: string;
  description: string;
  type: "boolean";
  required?: boolean;
  default?: boolean;
};

type Command = {
  name: string;
  short?: string;
  description: string;
  args: Arg[];
};

type Action =
  | { type: "help"; command?: Command }
  | { type: "create"; name: string; dir: string }
  | {
    type: "migrate";
    dir: string;
    one: boolean;
    dbPath: string;
    migrationsTable: string;
    sqlType: SqlType;
  }
  | {
    type: "rollback";
    dir: string;
    one: boolean;
    dbPath: string;
    migrationsTable: string;
    sqlType: SqlType;
  };

const COMMAND_DEFS: Command[] = [
  {
    name: "help",
    short: "h",
    description: "Display this message.",
    args: [],
  },
  {
    name: "create",
    short: "c",
    description: "Create a migration.",
    args: [
      {
        name: "name",
        short: "n",
        description:
          "The name of the migration. Used in filenames as an identifier",
        type: "string",
        required: true,
      },
      {
        name: "dir",
        short: "d",
        description:
          "A path to a directory to create the migration, if any. Defaults to the directory where this command is run.",
        type: "string",
      },
    ],
  },
  {
    name: "migrate",
    short: "m",
    description:
      "Run migrations in the migrations directory. If the one option is provided, it will only run a single migration.",
    args: [
      {
        name: "dir",
        short: "d",
        description:
          "A path to a directory to create the migration, if any. Defaults to the directory where this command is run.",
        type: "string",
      },
      {
        name: "one",
        short: "o",
        description: "Run only the next available migration",
        type: "boolean",
      },
      {
        name: "dbpath",
        short: "p",
        description: "Path to the DB",
        type: "string",
      },
    ],
  },
  {
    name: "rollback",
    short: "r",
    description:
      "Rollback all migrations. If the one option is provided, it will only run a single rollback.",
    args: [
      {
        name: "dir",
        short: "d",
        description:
          "A path to a directory to create the migration, if any. Defaults to the directory where this command is run.",
        type: "string",
      },
      {
        name: "one",
        short: "o",
        description: "Rollback only the last available migration",
        type: "boolean",
      },
      {
        name: "dbpath",
        short: "p",
        description: "Path to the DB",
        type: "string",
      },
    ],
  },
] as const;

function argUsage({ name, short, description, type, required }: Arg) {
  if (type === "string") {
    return `  ${name} ${short ? `(-${short})` : ""} ${
      required ? "" : "<optional>"
    }:: ${description}`;
  }

  return `  ${name} ${short ? `(-${short})` : ""} ${
    required ? "" : "<optional>"
  }:: ${description}`;
}

function formatArg({ name, required, type }: Arg) {
  const requiredFmt = (s: string) => required ? s : `(${s})`;

  return requiredFmt(
    type === "string" ? `--${name}=${name}` : `--${name}`,
  );
}

function commandUsage({ name, description, args }: Command) {
  const sortedArgs = args
    .toSorted((a, b) => {
      if (a.required && b.required) return 0;
      if (a.required && !b.required) return -1;
      return 1;
    });

  return [
    description,
    "",
    `usage: ${name} ${sortedArgs.map(formatArg).join(" ")}`,
    sortedArgs
      .map(argUsage)
      .join("\n"),
  ].join("\n") + "\n";
}

function usage() {
  return `rove <command>
where <command> is one of:

${
    COMMAND_DEFS.map((d) => `- ${d.name} ${d.short ? `or ${d.short}` : ""}`)
      .join("\n")
  }

You can get more info on any command by using:
rove <command> -h
`;
}

function printUsage(cmd?: Command) {
  if (cmd) {
    console.log(commandUsage(cmd));
    return;
  }

  console.log(usage());
}

function genParseOpts(): Parameters<typeof parseArgs>[1] {
  return COMMAND_DEFS.reduce(
    (acc, cmd) => {
      cmd.args.forEach((arg) => {
        if (acc && arg.type === "string" && Array.isArray(acc.string)) {
          acc.string.push(arg.name);
          if (arg.short) acc.string.push(arg.short);
        }
        if (acc && arg.type === "boolean" && Array.isArray(acc.boolean)) {
          acc.boolean.push(arg.name);
          if (arg.short) acc.boolean.push(arg.short);
        }
        if (
          acc && arg.default && acc.default && typeof acc.default === "object"
        ) {
          acc.default[arg.name] = arg.default;
        }
        if (
          acc && arg.default && acc.default &&
          typeof acc.default === "object" && arg.short
        ) {
          acc.default[arg.short] = arg.default;
        }
      });
      return acc;
    },
    {
      boolean: [],
      string: [],
      default: {},
    } as Parameters<typeof parseArgs>[1],
  );
}

function getValueFromFlags(
  flags: ReturnType<typeof parseArgs>,
  arg: Arg,
): "string" | "boolean" | null {
  if (arg.short && flags[arg.short] !== undefined) {
    return flags[arg.short];
  }
  if (flags[arg.name] !== undefined) {
    return flags[arg.name];
  }

  return null;
}

function checkRequiredArgs(
  flags: ReturnType<typeof parseArgs>,
  cmd: Command,
): Error | null {
  const requiredArgs = cmd.args.filter((c) => c.required);
  for (const requiredArg of requiredArgs) {
    const v = getValueFromFlags(flags, requiredArg);
    if (v === null) {
      return new Error(`Invalid usage of ${cmd.name} command`);
    }
  }

  return null;
}

function parseCliInputToCommand(): [Command, ReturnType<typeof parseArgs>] {
  const flags = parseArgs(Deno.args, genParseOpts());
  const [commandInput] = flags._;
  const command = COMMAND_DEFS.find((c) =>
    [c.name, c.short].includes(commandInput as string)
  );

  // help
  if (!command || flags.h) {
    dispatchAction({ type: "help", command });
    Deno.exit(0);
  }

  // Check the arguments are fed correctly
  const e = checkRequiredArgs(flags, command);
  if (e) {
    console.error(e.message);
    console.error(commandUsage(command));
    Deno.exit(1);
  }

  return [command, flags];
}

function commandToAction(
  command: Command,
  flags: ReturnType<typeof parseArgs>,
  config: RoveConfig,
): Action {
  if (["help", "h"].includes(command.name)) {
    return { type: "help" };
  }

  if (["create", "c"].includes(command.name)) {
    const name = getValueFromFlags(flags, command.args[0]) as string;
    const dir = getValueFromFlags(flags, command.args[1]) ??
      config?.migrationsDir;

    return {
      type: "create",
      name,
      dir: path.isAbsolute(dir) ? dir : path.join(Deno.cwd(), dir),
    };
  }

  if (["migrate", "m"].includes(command.name)) {
    const dir = getValueFromFlags(flags, command.args[0]) ??
      config.migrationsDir;
    const one = (getValueFromFlags(flags, command.args[1]) ?? false) as boolean;
    const dbPath = getValueFromFlags(flags, command.args[2]) ?? config.dbPath;
    if (!dbPath) {
      console.error(
        `A db path must be configured either with the ${
          command.args[2].name
        } option, or config file.`,
      );
      Deno.exit(1);
    }

    return {
      type: "migrate",
      dir: path.isAbsolute(dir) ? dir : path.join(Deno.cwd(), dir),
      one,
      sqlType: config.sqlType,
      dbPath,
      migrationsTable: config.migrationsTable,
    };
  }

  if (["rollback", "r"].includes(command.name)) {
    const dir = getValueFromFlags(flags, command.args[0]) ??
      config.migrationsDir;
    const one = (getValueFromFlags(flags, command.args[1]) ?? false) as boolean;
    const dbPath = getValueFromFlags(flags, command.args[2]) ?? config.dbPath;
    if (!dbPath) {
      console.error(
        `A db path must be configured either with the ${
          command.args[2].name
        } option, or config file.`,
      );
      Deno.exit(1);
    }

    return {
      type: "rollback",
      dir: path.isAbsolute(dir) ? dir : path.join(Deno.cwd(), dir),
      one,
      sqlType: config.sqlType,
      dbPath,
      migrationsTable: config.migrationsTable,
    };
  }

  return { type: "help" };
}

async function dispatchAction(action: Action) {
  switch (action.type) {
    case "help": {
      printUsage(action.command);
      break;
    }
    case "create": {
      await createMigrationFiles(action.name, action.dir);
      break;
    }
    case "migrate": {
      const connection = connect({
        dbPath: action.dbPath,
        sqlType: action.sqlType,
      });
      if (action.one) {
        await migrations.migrateOne(
          connection.db,
          action.dir,
          action.migrationsTable,
        );
      } else {
        await migrations.migrateAll(
          connection.db,
          action.dir,
          action.migrationsTable,
        );
      }
      break;
    }
    case "rollback": {
      const connection = connect({
        dbPath: action.dbPath,
        sqlType: action.sqlType,
      });
      if (action.one) {
        await migrations.rollbackOne(
          connection.db,
          action.dir,
          action.migrationsTable,
        );
      } else {
        await migrations.rollbackAll(
          connection.db,
          action.dir,
          action.migrationsTable,
        );
      }
      break;
    }
    default: {
      printUsage();
    }
  }
}

async function main() {
  const config = await getRoveConfig();
  const [command, flags] = parseCliInputToCommand();
  const action = commandToAction(command, flags, config);

  await dispatchAction(action);
  Deno.exit(0);
}

main();
