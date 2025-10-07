import { platform } from "@tauri-apps/plugin-os";

export type ApiResponse<T = unknown> = {
	data: T;
	code: number;
	message: string;
};

export const BACKEND_URL: string =
	import.meta.env.VITE_BACKEND_URL || "http://localhost:3002";

export const IMAGE_SIZE_LIMIT = 5 * 1024 * 1024; // 5 MB
export const IMAGE_FORMATS = ["image/jpeg", "image/jpg", "image/png"]
