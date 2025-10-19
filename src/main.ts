import { account, Account } from "./account.js";
import { exit } from "node:process";

const acc: Account = account(process.env.USERNAME, process.env.API_KEY);

//const auth: string = `Basic ${btoa(`${acc.username}:${acc.api_key}`)}`;
const auth: string = `Basic ${acc.api_key}`

const res = await fetch('https://e621.net/favorites.json?limit=320', {
	headers: {
		'Authorization': auth,
		'User-Agent': 'e621-favs-downloader/1.0 (by idontknowooooo on e621.net)',
	},
});

console.log(await res.json());
