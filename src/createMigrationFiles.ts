import * as path from "jsr:@std/path";

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

async function createMigrationFiles(
  migrationName: string,
  dirPath: string,
) {
  const b = filenameBase(migrationName);
  const te = new TextEncoder();
  const upFile = path.join(dirPath, filenameUp(b));
  const downFile = path.join(dirPath, filenameDown(b));

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

export default async function runCreateMigrationFiles(
  migrationName: string,
  dirPath: string,
) {
  console.log(`Creating migrations...`);
  const { upFile, downFile } = await createMigrationFiles(
    migrationName,
    dirPath,
  );
  console.log(`Created migrations ${downFile} and ${upFile} in ${dirPath}.`);
}
