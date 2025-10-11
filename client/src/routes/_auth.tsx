import { hiramiLogoDark } from "@/lib/assets";
import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
} from "@tanstack/react-router";
import type { JSX } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

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
	return (
		<div className="bg-gradient-to-b from-primary to-secondary h-full flex flex-col px-2">
			<div className="object-cover object-center h-1/3">
				<img src={hiramiLogoDark} alt="Hirami Logo" className="h-full w-full" />
			</div>

			<Card className="bg-background">
				<CardContent>
					<Tabs defaultValue="login" className="w-full">
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
