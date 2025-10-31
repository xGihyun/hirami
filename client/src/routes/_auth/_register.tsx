import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconX } from "@/lib/icons";
import {
	createFileRoute,
	linkOptions,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import { useState, type JSX } from "react";
import { RegisterProvider } from "./_register/-context";

export const Route = createFileRoute("/_auth/_register")({
	component: RouteComponent,
});

function RouteComponent(): JSX.Element {
	const router = useRouterState();
	const navigate = Route.useNavigate();
	const navOptions = linkOptions([
		{
			to: "/register/email",
		},
		{
			to: "/register/password",
		},
		{
			to: "/register/personal",
		},
	]);

	function isFirstStep(): boolean {
		return router.location.pathname.includes("email");
	}

	function getCurrentStepIndex(): number {
		return navOptions.findIndex((path) =>
			router.location.pathname.includes(path.to.split("/").pop() || ""),
		);
	}

	function getPreviousStep() {
		const currentIndex = getCurrentStepIndex();
		if (currentIndex <= 0) return null;
		return navOptions[currentIndex - 1];
	}

	async function handleBack(): Promise<void> {
		const previousStep = getPreviousStep();
		if (!previousStep) {
			// TODO: Navigate to Welcome Page
			await navigate({ to: "/login" });
			return;
		}

		await navigate(previousStep);
	}

	return (
		<RegisterProvider>
			<div className="h-full w-full">
				<Button
					variant="ghost"
					size="icon"
					className="size-15"
					onClick={handleBack}
				>
					{isFirstStep() ? (
						<IconX className="size-8" />
					) : (
						<IconArrowLeft className="size-8" />
					)}
				</Button>

				<main className="mt-10">
					<Outlet />
				</main>
			</div>
		</RegisterProvider>
	);
}
