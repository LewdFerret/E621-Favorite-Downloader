import dotenv from 'dotenv';
import { exit } from 'node:process';

dotenv.config();

const E621_USERNAME: string = process.env.E621_USERNAME;
const E621_API_KEY: string = process.env.E621_API_KEY;

if(E621_USERNAME.trim().length == 0) {
  console.error('Failed to get environment variable USERNAME');
  exit(1);
}

if(E621_API_KEY.trim().length == 0) {
  console.error('Failed to get environment variable E621_API_KEY');
  exit(1);
}

console.log(`username: ${E621_USERNAME}`);
console.log(`E621_API_KEY: ${E621_API_KEY}`);

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

console.log('1');

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

console.log('2');

const favCount = (await userDataRes.json())['favorite_count'];
console.log('favcount: ' + favCount);

let favorites: any

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

  console.log('3');

  favorites = await favRes.json();

  console.log(`fav 1: ${JSON.stringify(favorites['posts'][1], null, 2)}`);
} else {
  // TODO: figure out how to do this sh*t
}
