import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authed/_scan")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<main>
			<Outlet />

			<Tabs defaultValue="borrow" className="w-full">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="borrow" asChild>
						<Link to="/borrow-scan">Claim Borrow</Link>
					</TabsTrigger>
					<TabsTrigger value="return" asChild>
						<Link to="/return-scan">Confirm Return</Link>
					</TabsTrigger>
				</TabsList>
			</Tabs>
		</main>
	);
}
