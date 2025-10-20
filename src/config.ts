import dotenv from 'dotenv';
import { exit } from 'node:process';

dotenv.config();

const E621_USERNAME: string = process.env.E621_USERNAME;
const E621_API_KEY: string = process.env.E621_API_KEY;
const PRGRM_OUT_DIR: string = process.env.PRGRM_OUT_DIR;

if(E621_USERNAME.trim().length == 0) {
  console.error('Failed to get environment variable USERNAME');
  exit(1);
}

if(E621_API_KEY.trim().length == 0) {
  console.error('Failed to get environment variable E621_API_KEY');
  exit(1);
}

if(PRGRM_OUT_DIR.trim().length == 0) {
  console.error('Failed to get environment variable PRGRM_OUT_DIR');
  exit(1);
}

export interface Config {
  username: string,
  apiKey: string,
  outDir: string,
};

export function config(): Config {
  return {
    username: E621_USERNAME,
    apiKey: E621_API_KEY,
    outDir: PRGRM_OUT_DIR,
  };
}
