import dotenv from 'dotenv';
import { exit } from 'node:process';
import fs from 'node:fs';
import os from 'node:os';

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

fs.mkdir(PRGRM_OUT_DIR, { recursive: true }, (err) => {
  if(err) {
    console.error(`\x1b[31m[ERR] Failed to recursively create directory '${PRGRM_OUT_DIR}'.\nErrMsg: '''${err}'''.\x1b[0m`);
    exit(1);
  }
});

const AUTH = `Basic ${btoa(`${E621_USERNAME}:${E621_API_KEY}`)}`;
const USER_AGENT = 'e621-fav-downloader/1.0 (by idontknowooooo on e621.net)';

let userRes = await fetch(`https://e621.net/users/${E621_USERNAME}.json`, {
  headers: {
    'Authorization': AUTH,
    'User-Agent': USER_AGENT,
  },
}).catch((err) => {
  console.error(`\x1b[31mFailed to GET 'https://e621.net/users/${E621_USERNAME}.json'. ERROR: ${err}\x1b[0m`);
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

const favCount = (await userDataRes.json())['favorite_count'];
console.log('favcount: ' + favCount);

let favorites: any

if(favCount <= 320) {
  let favRes = await fetch(`https://e621.net/favorites.json?limit=320`, {
    headers: {
      'Authorization': AUTH,
      'User-Agent': USER_AGENT,
    },
  }).catch((err) => {
    console.error(`\x1b[31mFailed to GET 'https://e621.net/favorites.json?limit=${favCount}'. ERROR: ${err}\x1b[0m`);
    exit(1);
  });

  favorites = await favRes.json();
} else {
  const iterations = Math.ceil(favCount / 320);

  favorites = {};

  for(let i: number = 0; i < iterations; i++) {
    let favRes = await fetch(`https://e621.net/favorites.json?limit=320&page=${i + 1}`, {
      headers: {
        'Authorization': AUTH,
        'User-Agent': USER_AGENT,
      },
    }).catch((err) => {
      console.error(`\x1b[31mFailed to GET 'https://e621.net/favorites.json?limit=${favCount}'. ERROR: ${err}\x1b[0m`);
      exit(1);
    });

    let jsonRes = await favRes.json();

    for(let j: number = 0; j < jsonRes['posts'].length; j++) {
      favorites['posts'][favorites['posts'].length] = jsonRes['posts'][j];
    }
  }
}

if(!favorites) {
  console.error('\x1b[31mUnknown exception: JSON posts data empty.\x1b[0m');
  exit(1);
}

for(let i: number = 0; i < favorites['posts'].length; i++) {
  const postId: number = favorites['posts'][i]['id'] || -1;

  if(!favorites['posts'][i]['file']['url']) {
    console.log(`\x1b[33m[WARN] URL for post ${postId} not found\x1b[0m`);
    continue;
  }

  const start = Date.now();

  const fileRes = await fetch(favorites['posts'][i]['file']['url'], {
    headers: {
      'Authorization': AUTH,
      'User-Agent': USER_AGENT,
    }
  }).catch((err) => {
    console.error(`\x1b[31m[ERR] Failed to fetch file of post ${favorites['posts'][i]['id'] || -1}\nErrMsg: '''${err}'''.\x1b[0m`);
    exit(1);
  });

  const arrayBuffer = await fileRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const filename: string = `${PRGRM_OUT_DIR}/${postId}${favorites['posts'][i]['file']['ext'] ? `.${favorites['posts'][i]['file']['ext']}` : ''}`;
  fs.writeFile(filename,
    buffer,
    (err) => {
      if(err) {
        console.log(`\x1b[31mFailed to write into file '${filename}'.\nErrMsg: '''${err}'''.\x1b[0m`);
        exit(1);
      }
    }
  );

  const elapsed = Date.now() - start;
  const remaining = 2000 - elapsed;
  if(remaining > 0) await sleep(remaining);
}

async function sleep(ms: number): Promise<void> {
  return new Promise(
    (resolve) =>
      setTimeout(resolve, ms)
  );
}
