import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import Icons from "unplugin-icons/vite";

import tanstackRouter from "@tanstack/router-plugin/vite";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
		}),
		viteReact(),
		tailwindcss(),
		Icons({ compiler: "jsx", jsx: "react" }),
	],
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src"),
		},
	},
	// Env variables starting with the item of `envPrefix` will be exposed in tauri's source code through `import.meta.env`.
	envPrefix: ["VITE_", "TAURI_ENV_*"],
	build: {
		// Tauri uses Chromium on Windows and WebKit on macOS and Linux
		target:
			process.env.TAURI_ENV_PLATFORM == "windows" ? "chrome105" : "safari13",
		// don't minify for debug builds
		minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
		// produce sourcemaps for debug builds
		sourcemap: !!process.env.TAURI_ENV_DEBUG,
	},
});
