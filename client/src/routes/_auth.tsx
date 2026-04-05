import { createFileRoute, Outlet } from "@tanstack/react-router";
import type { JSX } from "react";

export const Route = createFileRoute("/_auth")({
	component: RouteComponent,
});

function RouteComponent(): JSX.Element {
	return <Outlet />;
}
