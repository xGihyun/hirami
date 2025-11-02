import { hiramiLogoDarkWithTitle } from "@/lib/assets";
import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useLocation,
} from "@tanstack/react-router";
import type { JSX } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

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
	const location = useLocation();
	function getCurrentTab(): "login" | "register" {
		if (location.pathname.includes("/register")) {
			return "register";
		}

		return "login";
	}

	return (
		<div className="bg-background flex flex-col h-svh pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] px-4">
			<Outlet />
		</div>
	);
}
