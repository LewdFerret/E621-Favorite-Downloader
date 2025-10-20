import { config } from './config.js';
import { exit } from 'node:process';
import fs from 'node:fs';
import CliProgress from 'cli-progress';
import { sleep, writeFile } from './common.js';

// ============= constants ==============

const CONFIG = config();

const AUTH = `Basic ${btoa(`${CONFIG.username}:${CONFIG.apiKey}`)}`;
const USER_AGENT = 'e621-fav-downloader/1.0 (by idontknowooooo on e621.net)';
const HEADERS = {
  'Authorization': AUTH,
  'User-Agent': USER_AGENT,
};

let state: GlobalState = {
  favCount: -1,
  favorites: {},
}

// ========= private interfaces =========

interface GlobalState {
  favCount: number,
  favorites: any,
}

// ========== public functions ==========

export async function setupProgram(): Promise<void> {
  fs.mkdir(CONFIG.outDir, { recursive: true }, (err) => {
    if (err) {
      console.error(`\x1b[31m[ERR] Failed to recursively create directory '${CONFIG.outDir}'.\nErrMsg: '''${err}'''.\x1b[0m`);
      exit(1);
    }
  });
}

export async function fetchFavoriteCount(): Promise<void> {
  let userRes = await fetch(`https://e621.net/users/${CONFIG.username}.json`, {
    headers: HEADERS,
  }).catch((err) => {
    console.error(`\x1b[31mFailed to GET 'https://e621.net/users/${CONFIG.username}.json'. ERROR: ${err}\x1b[0m`);
    exit(1);
  });

  const userId = (await userRes.json())['id'];

  let userDataRes = await fetch(`https://e621.net/users/${userId}.json`, {
    headers: {
      'Authorization': AUTH,
      'User-Agent': USER_AGENT,
    },
  }).catch((err) => {
    console.error(`\x1b[31mFailed to GET 'https://e621.net/users/${userId}.json'. ERROR: ${err}\x1b[0m`);
    exit(1);
  });

  state.favCount = (await userDataRes.json())['favorite_count'];
}

export async function fetchFavorites(): Promise<void> {
  if (state.favCount <= 320) {
    let favRes = await fetch(`https://e621.net/favorites.json?limit=320`, {
      headers: HEADERS,
    }).catch((err) => {
      console.error(`\x1b[31mFailed to GET 'https://e621.net/favorites.json?limit=${state.favCount}'. ERROR: ${err}\x1b[0m`);
      exit(1);
    });

    state.favorites = await favRes.json();
  } else {
    const iterations = Math.ceil(state.favCount / 320);

    state.favorites = {};

    for (let i: number = 0; i < iterations; i++) {
      let favRes = await fetch(`https://e621.net/favorites.json?limit=320&page=${i + 1}`, {
        headers: HEADERS,
      }).catch((err) => {
        console.error(`\x1b[31mFailed to GET 'https://e621.net/favorites.json?limit=${state.favCount}'. ERROR: ${err}\x1b[0m`);
        exit(1);
      });

      let jsonRes = await favRes.json();

      for (let j: number = 0; j < jsonRes['posts'].length; j++) {
        state.favorites['posts'][state.favorites['posts'].length] = jsonRes['posts'][j];
      }
    }
  }

  if (!state.favorites || !state.favorites['posts']) {
    console.error('\x1b[31mUnknown exception: JSON posts data empty.\x1b[0m');
    exit(1);
  }
}

export async function downloadFile(multibar: CliProgress.MultiBar, url: string, filepath: string, overallBar: CliProgress.SingleBar): Promise<void> {
  const start = Date.now();

  const res = await fetch(url, {
    headers: HEADERS,
  });
  if(!res.ok) throw new Error(`\x1b[31mFailed to fetch '${url}'. Status ${res.status} ${res.statusText}`);

  const totalBytes = Number(res.headers.get('content-length')) || 0;
  const reader = res.body.getReader();
  let received = 0;
  const chunks = [];

  const fileProgressBar = multibar.create(
    totalBytes,
    0,
    { 
      filename: filepath,
      unit: 'bytes',
    },
  );

  while(true) {
    const { done, value } = await reader.read();
    if(done) break;

    chunks.push(value);
    received += value.length;
    fileProgressBar.update(received);
  }

  fileProgressBar.stop();

  const buffer = Buffer.concat(chunks);
  await writeFile(filepath, buffer);

  overallBar.increment();

  const elapsed = Date.now() - start;
  const remaining = 2000 - elapsed;
  if(remaining > 0) await sleep(remaining);
}

export async function downloadAllFiles(): Promise<void> {
  const multibar = new CliProgress.MultiBar({
    format: '[{bar}] {percentage}% | {value}/{total} {unit} | {filename}',
    clearOnComplete: false,
    hideCursor: true,
  }, CliProgress.Presets.shades_classic);
  
  const overallBar = multibar.create(state.favorites['posts'].length, 0, {
    filename: 'Overall progress',
    unit: 'files',
  });

  for (let i: number = 0; i < state.favorites['posts'].length; i++) {
    const postId: number = state.favorites['posts'][i]['id'] || -1;

    if (!state.favorites['posts'][i]['file']['url']) {
      console.log(`\x1b[33m[WARN] URL for post ${postId} not found\x1b[0m`);
      overallBar.update(i);
      continue;
    }

    const ext = state.favorites['posts'][i]['file']['ext'] ?
      '.' + state.favorites['posts'][i]['file']['ext'] :
      '';

    await downloadFile(
      multibar,
      state.favorites['posts'][i]['file']['url'],
      `${CONFIG.outDir}/${postId}${ext}`,
      overallBar,
    );
  }

  multibar.stop();
}
