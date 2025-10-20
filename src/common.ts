import fs from 'node:fs';
import { promisify } from 'node:util';

export const sleep: (ms: number) => Promise<void> = (ms: number) => new Promise(r => setTimeout(r, ms));

export const writeFile = promisify(fs.writeFile);
