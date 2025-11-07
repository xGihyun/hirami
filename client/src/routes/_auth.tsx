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
		<div className="bg-background flex flex-col h-svh pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] px-4">
			<Outlet />
		</div>
	);
}
