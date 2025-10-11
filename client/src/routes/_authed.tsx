import { Navbar } from "@/components/navbar";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import type { JSX } from "react";

export const Route = createFileRoute("/_authed")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		const session = await context.auth.validateSession();
		if (session === null) {
			throw redirect({ to: "/login" });
		}

		return {
			session: session,
		};
	},
});

function RouteComponent(): JSX.Element {
	return (
		<div className="pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
			<Outlet />
			<Navbar /> 
		</div>
	);
}
