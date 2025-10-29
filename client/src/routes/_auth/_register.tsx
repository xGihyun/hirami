import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconX } from "@/lib/icons";
import {
	createFileRoute,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import type { JSX } from "react";
import { RegisterProvider } from "./_register/-context";

export const Route = createFileRoute("/_auth/_register")({
	component: RouteComponent,
});

function RouteComponent(): JSX.Element {
	const router = useRouterState();

	function isFirstStep() {
		return router.location.pathname.includes("email");
	}

	return (
		<RegisterProvider>
			<main className="h-full w-full">
				<Button variant="ghost" size="icon" className="size-15">
					{isFirstStep() ? (
						<IconX className="size-8" />
					) : (
						<IconArrowLeft className="size-8" />
					)}
				</Button>

				<Outlet />
			</main>
		</RegisterProvider>
	);
}
