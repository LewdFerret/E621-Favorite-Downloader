import { downloadAllFiles, fetchFavoriteCount, fetchFavorites, setupProgram } from "./lib.js";

async function main(): Promise<void> {
  await setupProgram();
  await fetchFavoriteCount();
  await fetchFavorites();
  await downloadAllFiles();
}

await main();
