import { hiramiLogoDark } from "@/lib/assets";
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
		<div className="bg-gradient-to-t from-primary to-secondary flex flex-col px-2 h-svh pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
			<div className="object-cover object-center h-1/4">
				<img src={hiramiLogoDark} alt="Hirami Logo" className="h-full w-full" />
			</div>
			<Card className="bg-background">
				<CardContent>
					<Tabs value={getCurrentTab()} className="w-full">
						<TabsList className="w-full">
							<TabsTrigger value="login" asChild>
								<Link to="/login">Login</Link>
							</TabsTrigger>
							<TabsTrigger value="register" asChild>
								<Link to="/register">Register</Link>
							</TabsTrigger>
						</TabsList>
						<Outlet />
					</Tabs>
				</CardContent>
			</Card>
		</div>
	);
}
