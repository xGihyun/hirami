import { platform } from "@tauri-apps/plugin-os";

export type ApiResponse<T = unknown> = {
	data: T;
	code: number;
	message: string;
};

// const currentPlatform = platform();

// export const BACKEND_URL: string =
// 	currentPlatform === "android" ? "http://192.168.254.106:3002" : import.meta.env.VITE_BACKEND_URL;

export const BACKEND_URL: string = import.meta.env.VITE_BACKEND_URL;
