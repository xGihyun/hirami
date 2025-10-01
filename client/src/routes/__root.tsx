import {
	Outlet,
	createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanstackDevtools } from "@tanstack/react-devtools";
import { QueryClient } from "@tanstack/react-query";

import Header from "../components/Header";

type RouterContext = {
	auth: any; // TODO: Create `AuthContextValue` type
	queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
	component: () => (
		<>
			<Header />
			<Outlet />
			<TanstackDevtools
				config={{
					position: "bottom-left",
				}}
				plugins={[
					{
						name: "Tanstack Router",
						render: <TanStackRouterDevtoolsPanel />,
					},
				]}
			/>
		</>
	),
});
