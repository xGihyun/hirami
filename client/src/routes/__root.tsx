import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
// import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
// import { TanstackDevtools } from "@tanstack/react-devtools";
import { QueryClient } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/sonner";
import { useAuth, type AuthContextValue } from "@/auth";
import type { JSX } from "react";

type RouterContext = {
	auth: AuthContextValue;
	queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RouteComponent,
});

function RouteComponent(): JSX.Element {
	return (
		<div className="h-svh">
			<Toaster closeButton />
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
		</div>
	);
}
