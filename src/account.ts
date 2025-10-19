export interface Account {
	username: string;
	api_key: string;
}

export function account(username: string, api_key: string): Account {
	return {
		username: username,
		api_key: api_key,
	};
}
