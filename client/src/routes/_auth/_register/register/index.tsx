import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_register/register/")({
	beforeLoad: () => {
		throw redirect({ to: "/register/email" });
	},
});
