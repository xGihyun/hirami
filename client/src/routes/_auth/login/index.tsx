import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "./-components/form";
import type { JSX } from "react";

export const Route = createFileRoute("/_auth/login/")({
	component: RouteComponent,
});

function RouteComponent(): JSX.Element {
	return <LoginForm />;
}
