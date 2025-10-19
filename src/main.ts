import dotenv from 'dotenv';
import { exit } from 'node:process';

dotenv.config();

const USERNAME: string = process.env.USERNAME;
const API_KEY: string = process.env.API_KEY;

if(USERNAME.trim().length == 0) {
  console.error('Failed to get environment variable USERNAME');
}

if(API_KEY.trim().length == 0) {
  console.error('Failed to get environment variable API_KEY');
}

const AUTH = `Basic ${btoa(`${USERNAME}:${API_KEY}`)}`;
const USER_AGENT = 'e621-fav-downloader/1.0 (by idontknowooooo on e621.net)';

let userRes = await fetch(`https://e621.net/users/${USERNAME}.json`, {
  headers: {
    'Authorization': AUTH,
    'User-Agent': USER_AGENT,
  },
}).catch((err) => {
  console.error(`\x1b[31mFailed to GET 'https://e621.net/users/${USERNAME}.json'. ERROR: ${err}\x1b[0m`);
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

if(favCount <= 320) {
  let favRes = await fetch(`https://e621.net/favorites.json?limit=${favCount}`, {
    headers: {
      'Authorization': AUTH,
      'User-Agent': USER_AGENT,
    },
  }).catch((err) => {
    console.error(`\x1b[31mFailed to GET 'https://e621.net/favorites.json?limit=${favCount}'. ERROR: ${err}\x1b[0m`);
    exit(1);
  });

  let favorites = await favRes.json();
}
