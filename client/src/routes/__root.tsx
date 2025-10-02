import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanstackDevtools } from "@tanstack/react-devtools";
import { QueryClient } from "@tanstack/react-query";

import Header from "../components/Header";
import { Toaster } from "@/components/ui/sonner";
import type { AuthContextValue } from "@/auth";

type RouterContext = {
	auth: AuthContextValue;
	queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
	component: () => (
		<>
			<Toaster closeButton />
			<Header />
			<Outlet />
			{/* <TanstackDevtools */}
			{/* 	config={{ */}
			{/* 		position: "bottom-left", */}
			{/* 	}} */}
			{/* 	plugins={[ */}
			{/* 		{ */}
			{/* 			name: "Tanstack Router", */}
			{/* 			render: <TanStackRouterDevtoolsPanel />, */}
			{/* 		}, */}
			{/* 	]} */}
			{/* /> */}
		</>
	),
});
