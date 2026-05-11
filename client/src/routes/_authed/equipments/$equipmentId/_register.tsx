import {
	createFileRoute,
	linkOptions,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import { RegisterEquipmentProvider } from "./_register/-context";
import { Button } from "@/components/ui/button";
import type { JSX } from "react";
import { IconArrowLeft, IconX } from "@/lib/icons";

export const Route = createFileRoute(
	"/_authed/equipments/$equipmentId/_register",
)({
	component: RouteComponent,
});

function RouteComponent(): JSX.Element {
	const router = useRouterState();
	const params = Route.useParams();
	const navigate = Route.useNavigate();
	const navOptions = linkOptions([
		{
			to: "/equipments/$equipmentId/register/name",
			params,
		},
		{
			to: "/equipments/$equipmentId/register/quantity",
			params,
		},
		{
			to: "/equipments/$equipmentId/register/image",
			params,
		},
	]);

	function isFirstStep(): boolean {
		return router.location.pathname.includes("name");
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
			await navigate({ to: "/equipments" });
			return;
		}

		await navigate(previousStep);
	}

	return (
		<RegisterEquipmentProvider>
			<Button
				variant="ghost"
				size="icon"
				className="size-15 flex md:hidden"
				onClick={handleBack}
			>
				{isFirstStep() ? (
					<IconX className="size-8" />
				) : (
					<IconArrowLeft className="size-8" />
				)}
			</Button>

			{/* <Button */}
			{/* 	variant="ghost" */}
			{/* 	size="icon" */}
			{/* 	className="size-15 hidden md:flex" */}
			{/* 	asChild */}
			{/* > */}
			{/* 	<Link to="/equipments"> */}
			{/* 		<IconArrowLeft className="size-8" /> */}
			{/* 	</Link> */}
			{/* </Button> */}

			<main>
				<Outlet />
			</main>
		</RegisterEquipmentProvider>
	);
}
