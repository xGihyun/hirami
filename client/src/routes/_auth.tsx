import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import type { JSX } from "react";

export const Route = createFileRoute("/_auth")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		const session = await context.auth.validateSession();
		if (session !== null) {
			throw redirect({ to: "/equipments" });
		}
	},
});

function RouteComponent(): JSX.Element {
	return (
		<div>
			<Outlet />
		</div>
	);
}
