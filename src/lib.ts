import { config } from './config.js';
import { exit } from 'node:process';
import fs from 'node:fs';
import blessed from 'blessed';
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

const screen = blessed.screen({
  smartCSR: true,
  title: 'E621 Favorites Downloader',
});

const box = blessed.box({
  top: 0,
  left: 0,
  width: '100%',
  height: '100%-1',
  tags: true,
  scrollable: true,
  alwaysScroll: true,
  keys: true,
  vi: true,
  scrollbar: { style: { bg: 'yellow' }},
});

const statusBar = blessed.box({
  bottom: 0,
  height: 1,
  width: '100%',
  style: { bg: 'blue' },
  tags: true,
  content: 'Press {white-fg}q{/white-fg} to quit',
});

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

  screen.append(box);
  screen.append(statusBar);
  screen.render();
  screen.key(['q', 'C-c'], () => process.exit(0));
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

function progressBar(current: number, total: number, width: number = 30): string {
  const ratio = total ? current / total : 0;
  const filled = Math.round(ratio * width);

  return '[' + '█'.repeat(filled) +
    ' '.repeat(width - filled) + `] ${(ratio * 100).toFixed(1)}%`;
}

export async function downloadFile(url: string, filepath: string, index: number): Promise<void> {
  const start = Date.now();

  const res = await fetch(url, {
    headers: HEADERS,
  });
  if(!res.ok) throw new Error(`\x1b[31mFailed to fetch '${url}'. Status ${res.status} ${res.statusText}`);

  const totalBytes = Number(res.headers.get('content-length')) || 0;
  const reader = res.body.getReader();
  let received = 0;
  const chunks = [];

  while(true) {
    const { done, value } = await reader.read();
    if(done) break;

    chunks.push(value);
    received += value.length;

    const elapsed = Number(((Date.now() - start) / 1000).toFixed(1));
    const bar = progressBar(received, totalBytes);
    const speed = ((received / 1024) / (elapsed || 1)).toFixed(1);
    box.setLine(index, `{bold}${filepath}{/bold} ${bar} ${speed} KB/s`);
    box.scrollTo(index);
    screen.render();
  }

  const buffer = Buffer.concat(chunks);
  await writeFile(filepath, buffer);

  const elapsed = Date.now() - start;
  const remaining = 2000 - elapsed;
  if(remaining > 0) await sleep(remaining);
}

export async function downloadAllFiles(): Promise<void> {
  const totalFiles = state.favorites['posts'].length;
  let completed = 0;

  for (let i: number = 0; i < totalFiles; i++) {
    const postId: number = state.favorites['posts'][i]['id'] || -1;

    if (!state.favorites['posts'][i]['file']['url']) {
      box.setLine(i, `{yellow-fg}URL for post ${postId} not found{/yellow-fg}`);
      screen.render();
      continue;
    }

    const ext = state.favorites['posts'][i]['file']['ext'] ?
      '.' + state.favorites['posts'][i]['file']['ext'] :
      '';

    await downloadFile(
      state.favorites['posts'][i]['file']['url'],
      `${CONFIG.outDir}/${postId}${ext}`,
      i,
    );
    completed++;

    const overallBar = progressBar(completed, totalFiles);
    statusBar.setContent(`Total ${overallBar} (${completed} / ${totalFiles}) | Press q to quit`);
    screen.render();
  }

  statusBar.setContent('{green-fg}✓ All downloads complete!{/green-fg} | Press q to quit');
  screen.render();
}
