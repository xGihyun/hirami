export type ApiResponse<T = unknown> = {
	data: T;
	code: number;
	message: string;
};

export const BACKEND_URL: string =
	import.meta.env.VITE_BACKEND_URL || "http://localhost:3002";
export const SHOW_ANOMALY: boolean = import.meta.env.VITE_SHOW_ANOMALY === "true" || false;

export const IMAGE_SIZE_LIMIT = 5 * 1024 * 1024; // 5 MB
export const IMAGE_FORMATS = ["image/jpeg", "image/jpg", "image/png"];

export function toImageUrl(path?: string | null): string | undefined {
	if (!path) {
		return;
	}

	return `${BACKEND_URL}${path}`;
}

export enum Sort {
	Asc = "asc",
	Desc = "desc",
}

export function getCookie(name: string): string | undefined {
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) return parts.pop()?.split(";").shift();
}

export async function protectedFetch(
	url: string | URL,
	options: RequestInit = {},
): Promise<Response> {
	const token = getCookie("session");
	const headers = new Headers(options.headers);

	if (token) {
		headers.set("Authorization", `Bearer ${token}`);
	}

	return fetch(url, {
		...options,
		headers,
	});
}
