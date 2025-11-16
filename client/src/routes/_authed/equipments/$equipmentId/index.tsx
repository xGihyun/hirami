import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

export const Route = createFileRoute("/_authed/equipments/$equipmentId/")({
	component: RouteComponent,
});

function RouteComponent(): JSX.Element {
	return <div>Equipment here!</div>;
}
