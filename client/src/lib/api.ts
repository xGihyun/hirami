export type ApiResponse<T = unknown> = {
	data: T;
	code: number;
	message: string;
};

export const BACKEND_URL: string =
	import.meta.env.VITE_BACKEND_URL || "http://localhost:3002";

export const IMAGE_SIZE_LIMIT = 5 * 1024 * 1024; // 5 MB
export const IMAGE_FORMATS = ["image/jpeg", "image/jpg", "image/png"];

export function toImageUrl(path?: string): string | undefined {
	if (!path) {
		return;
	}

	return `${BACKEND_URL}${path}`;
}

export enum Sort {
	Asc = "asc",
	Desc = "desc",
}
