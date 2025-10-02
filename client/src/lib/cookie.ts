export function getCookie(key: string): string | undefined {
	if (typeof document === "undefined") {
		return;
	}

	const match = document.cookie.match(
		new RegExp(`(?:^|; )${encodeURIComponent(key)}=([^;]*)`),
	);
	return match ? decodeURIComponent(match[1]) : undefined;
}

type CookieOptions = { path?: string; expires?: Date; secure?: boolean };

export function setCookie(
	key: string,
	value: string,
	options: CookieOptions = {},
): void {
	if (typeof document === "undefined") {
		return;
	}

	let cookieString = `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;

	if (options.expires) {
		cookieString += `; expires=${options.expires.toUTCString()}`;
	}

	if (options.path) {
		cookieString += `; path=${options.path}`;
	}

	if (options.secure) {
		cookieString += `; secure`;
	}

	document.cookie = cookieString;
}

export function deleteCookie(key: string, path?: string) {
	setCookie(key, "", { path: path, expires: new Date(0) });
}
