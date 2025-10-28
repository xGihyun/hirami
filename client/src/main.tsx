import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

import "./styles.css";
import reportWebVitals from "./reportWebVitals.ts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./auth.tsx";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";

const queryClient = new QueryClient();

// Create a new router instance
const router = createRouter({
	routeTree,
	context: {
		auth: undefined!, // Will be set from the component
		queryClient,
	},
	defaultPreload: "intent",
	scrollRestoration: true,
	defaultStructuralSharing: true,
	defaultPreloadStaleTime: 0,
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

// Render the app
const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<StrictMode>
			<QueryClientProvider client={queryClient}>
				<AuthProvider>
					<App />
				</AuthProvider>
			</QueryClientProvider>
		</StrictMode>,
	);
}

function handleDeepLink(url: string): void {
	console.log("Deep link URL received:", url);
	try {
		const urlWithoutProtocol = url.replace(/^hirami:\/\//, "");
		const path = `/${urlWithoutProtocol}`;

		console.log("Parsed path:", path);

		if (path.startsWith("/password-reset/")) {
			console.log(`Navigating to: ${path}`);
			router.navigate({ to: path });
		} else {
			console.warn(`Ignoring unhandled deep link: ${path}`);
		}
	} catch (e) {
		console.error("Failed to parse deep link URL:", e);
	}
}

const startUrls = await getCurrent();
console.log("Initial deep link check:", startUrls);
if (startUrls && startUrls.length > 0) {
	// handleDeepLink(startUrls[0]);
}

await onOpenUrl((urls) => {
	console.log("onOpenUrl triggered with:", urls);
	if (urls && urls.length > 0) {
		handleDeepLink(urls[0]);
	}
});

function App() {
	const auth = useAuth();
	return <RouterProvider router={router} context={{ auth }} />;
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
