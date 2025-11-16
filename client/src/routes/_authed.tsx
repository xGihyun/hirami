import { Navbar } from "@/components/navbar";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import type { JSX } from "react";

export const Route = createFileRoute("/_authed")({
	component: RouteComponent,
	beforeLoad: ({ context }) => {
		console.log(context);
		if (!context.auth.user) {
			throw redirect({ to: "/onboarding" });
		}
	},
});

function RouteComponent(): JSX.Element {
	return (
		<div className="pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))] px-4 lg:px-10">
			<Outlet />
			<Navbar />
		</div>
	);
}
