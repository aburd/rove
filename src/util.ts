/**
 * Gets a file to string as utf-8
 * @param path A path to the file
 */
export async function fileToString(path: string): Promise<string> {
  const decoder = new TextDecoder("utf-8");
  const data = await Deno.readFile(path);

  return decoder.decode(data);
}
