import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	beforeLoad: async ({ context }) => {
		const session = await context.auth.validateSession();
		if (session) {
			throw redirect({ to: "/equipments" });
		}
		throw redirect({ to: "/landing" });
	},
});
