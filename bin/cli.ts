import { parseArgs } from "@cli/parse-args";
import createMigrationFiles from "../src/createMigrationFiles.ts";
import * as migrations from "../src/migrations.ts";
import { connect } from "../src/db/mod.ts";

type ArgDef = {
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

type CommandDef = {
  name: string;
  short?: string;
  description: string;
  args: ArgDef[];
};

type Command =
  | { type: "help", commandDef?: CommandDef }
  // alias for help
  | { type: "h" }
  | { type: "create"; name: string; dir: string }
  | { type: "migrate"; dir: string; one: boolean }
  | { type: "rollback"; dir: string; one: boolean };

const COMMAND_DEFS: CommandDef[] = [
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
    ],
  },
] as const;

function argUsage({ name, short, description, type }: ArgDef) {
  if (type === "string") {
    return `  --${name}='${name}' ${
      short ? `-${short} '${name}'` : ""
    } :: ${description}`;
  }
  return `  --${name} ${short ? `-${short}` : ""} :: ${description}`;
}

function commandUsage({ name, description, args }: CommandDef) {
  return [
    `* ${name} - ${description}`,
    '',
    `usage: ${name} ${args.map((a) => `<${a.name}>`).join(" ")}`,
    args
      .map(argUsage)
      .join("\n"),
  ].join("\n") + "\n";
}

function usage() {
  return `rove <command>
where <command> is one of:
${COMMAND_DEFS.map(commandUsage).join("\n")}`;
}

function printUsage(cmd?: CommandDef) {
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
  arg: ArgDef,
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
  cmd: CommandDef,
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

function parseCliInput(): Command {
  const flags = parseArgs(Deno.args, genParseOpts());
  const [cmdS] = flags._;
  const cmd = COMMAND_DEFS.find((c) => c.name === cmdS || c.short === cmdS);
  if (!cmd) return { type: "help" };

  // help
  if (flags.h) {
    const commandDef = COMMAND_DEFS.find(d => [cmd.name, cmd.short].includes(d.name));
    return { type: "help", commandDef };
  }

  // Check the arguments are fed correctly
  const e = checkRequiredArgs(flags, cmd);
  if (e) {
    console.error(e.message);
    console.error(commandUsage(cmd));
    Deno.exit(1);
  }

  if (["help", "h"].includes(cmd.name)) {
    return { type: "help" };
  }

  if (["create", "c"].includes(cmd.name)) {
    const name = getValueFromFlags(flags, cmd.args[0]) as string;
    const dir = getValueFromFlags(flags, cmd.args[1]) ?? Deno.cwd();
    return { type: "create", name, dir };
  }

  if (["migrate", "m"].includes(cmd.name)) {
    const dir = getValueFromFlags(flags, cmd.args[0]) ?? Deno.cwd();
    const one = (getValueFromFlags(flags, cmd.args[1]) ?? false) as boolean;
    return { type: "migrate", dir, one };
  }

  if (["rollback", "r"].includes(cmd.name)) {
    const dir = getValueFromFlags(flags, cmd.args[0]) ?? Deno.cwd();
    const one = (getValueFromFlags(flags, cmd.args[1]) ?? false) as boolean;
    return { type: "rollback", dir, one };
  }

  return { type: "help" };
}

function main() {
  const cmd = parseCliInput();

  switch (cmd.type) {
    case "help": {
      printUsage(cmd.commandDef);
      break;
    }
    case "create": {
      createMigrationFiles(cmd.name, cmd.dir);
      break;
    }
    case "migrate": {
      const connection = connect({
        dbPath: "resources/test.db",
        type: "sqlite3",
      });
      if (cmd.one) {
        migrations.migrateOne(connection.db, cmd.dir);
      } else {
        migrations.migrateAll(connection.db, cmd.dir);
      }
      break;
    }
    case "rollback": {
      const connection = connect({
        dbPath: "resources/test.db",
        type: "sqlite3",
      });
      if (cmd.one) {
        migrations.rollbackOne(connection.db, cmd.dir);
      } else {
        migrations.rollbackAll(connection.db, cmd.dir);
      }
      break;
    }
    default: {
      printUsage();
    }
  }
}

main();
