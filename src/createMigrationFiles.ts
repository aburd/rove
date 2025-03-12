import * as path from "@std/path";
import { exists } from "@std/fs/exists";

function filenameBase(migrationName: string) {
  const d = new Date();
  return `${d.valueOf()}_${migrationName}`;
}
function filenameUp(baseName: string) {
  return `${baseName}.up.sql`;
}
function filenameDown(baseName: string) {
  return `${baseName}.down.sql`;
}

async function createFiles(
  migrationName: string,
  dirPath: string,
) {
  const b = filenameBase(migrationName);
  const te = new TextEncoder();
  const upFile = path.join(dirPath, filenameUp(b));
  const downFile = path.join(dirPath, filenameDown(b));

  if (!(await exists(dirPath))) {
    await Deno.mkdir(dirPath);
  }

  await Promise.all([
    Deno.writeFile(
      upFile,
      te.encode("-- Write your up migration here"),
    ),
    Deno.writeFile(
      downFile,
      te.encode("-- Write your down migration here"),
    ),
  ]);

  return { upFile, downFile };
}

export async function createMigrationFiles(
  migrationName: string,
  dirPath: string,
) {
  console.log(`Creating migrations...`);
  const { upFile, downFile } = await createFiles(
    migrationName,
    dirPath,
  );
  console.log(`Created migrations ${downFile} and ${upFile} in ${dirPath}.`);
}
