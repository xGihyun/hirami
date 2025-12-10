import { createFileRoute, Outlet } from "@tanstack/react-router";
import type { JSX } from "react";

export const Route = createFileRoute("/_auth")({
	component: RouteComponent,
});

function RouteComponent(): JSX.Element {
	return (
		<div className="pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))] bg-background flex flex-col h-svh px-4">
			<Outlet />
		</div>
	);
}
