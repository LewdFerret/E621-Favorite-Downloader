import { downloadAllFiles, fetchFavoriteCount, fetchFavorites, setupProgram } from "./lib.js";

async function main(): Promise<void> {
  console.log('Starting download...\n');

  await setupProgram();
  await fetchFavoriteCount();
  await fetchFavorites();
  await downloadAllFiles();

  console.log(`\x1b[32m (✓) Finished downloading favorites!\x1b[0m`);
}

await main();
