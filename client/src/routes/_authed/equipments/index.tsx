import {
	equipmentNamesQuery,
	equipmentsQuery,
	type Equipment,
} from "@/lib/equipment";
import {
	useMutationState,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { BACKEND_URL } from "@/lib/api";
import { useEffect, useState, type JSX } from "react";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { BorrowEquipmentForm } from "./-components/borrow-equipment-form";
import { IconPlus } from "@/lib/icons";
import { useAuth } from "@/auth";
import { UserRole } from "@/lib/user";
import { RegisterEquipmentForm } from "./-components/register-equipment-form";
import { EventSource } from "eventsource";
import { CatalogHeader } from "./-components/catalog-header";
import { CatalogSearch } from "./-components/catalog-search";
import z from "zod";
import { BorrowSuccess } from "./-components/borrow-success";
import { BorrowFailed } from "./-components/borrow-failed";
import { Catalog } from "./-components/catalog";
import { LabelMedium } from "@/components/typography";
import { Loading } from "@/components/loading";
import { CatalogCategories } from "./-components/catalog-categories";

const searchSchema = z.object({
	success: z.boolean().optional(),
	categories: z.array(z.string()).optional().default([]),
});

export const Route = createFileRoute("/_authed/equipments/")({
	component: RouteComponent,
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(equipmentsQuery());
		context.queryClient.ensureQueryData(equipmentNamesQuery());
	},
	validateSearch: searchSchema,
});

export type SelectedEquipment = {
	equipment: Equipment;
	quantity: number;
};

function RouteComponent(): JSX.Element {
	const search = Route.useSearch();

	const equipments = useQuery(equipmentsQuery(search.categories));
	const equipmentNames = useSuspenseQuery(equipmentNamesQuery());
	const auth = useAuth();
	const [isBorrowing, setIsBorrowing] = useState(false);

	const [selectedEquipments, setSelectedEquipments] = useState<
		SelectedEquipment[]
	>([]);
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const mutationState = useMutationState({
		filters: {
			mutationKey: ["submit-borrow-request"],
		},
		select: (mutation) => mutation.state.status,
	});
	const mutationStatus = mutationState[0];

	function handleUpdateQuantity(
		equipment: Equipment,
		newQuantity: number,
	): void {
		setSelectedEquipments((prev) =>
			prev.map((item) =>
				item.equipment.id === equipment.id
					? { ...item, quantity: newQuantity }
					: item,
			),
		);
	}

	function onSuccess(): void {
		setIsBorrowing(false);
		setIsDrawerOpen(false);
		setSelectedEquipments([]);
	}

	const queryClient = useQueryClient();

	useEffect(() => {
		const eventSource = new EventSource(`${BACKEND_URL}/events`);

		function handleEquipmentInvalidation(_: MessageEvent): void {
			queryClient.invalidateQueries(equipmentsQuery());
			queryClient.invalidateQueries(equipmentNamesQuery());
		}

		eventSource.addEventListener(
			"equipment:create",
			handleEquipmentInvalidation,
		);

		return () => {
			eventSource.removeEventListener(
				"equipment:create",
				handleEquipmentInvalidation,
			);
			eventSource.close();
		};
	}, [queryClient]);

	if (mutationStatus === "pending") {
		return <Loading />;
	}

	if (search.success === true) {
		return <BorrowSuccess />;
	}

	if (search.success === false) {
		return <BorrowFailed setIsBorrowing={setIsBorrowing} />;
	}

	if (isBorrowing) {
		return (
			<BorrowEquipmentForm
				handleUpdateQuantity={handleUpdateQuantity}
				onSuccess={onSuccess}
				selectedEquipments={selectedEquipments}
				setIsBorrowing={setIsBorrowing}
			/>
		);
	}

	return (
		<div className="relative space-y-4">
			<CatalogHeader user={auth.user!} />
			<CatalogSearch user={auth.user!} />
			<CatalogCategories equipmentNames={equipmentNames.data} />

			{equipments.isError || equipments.data === undefined ? (
				<LabelMedium className="text-muted text-center mt-10">
					Failed to load equipment catalog
				</LabelMedium>
			) : (
				<Catalog
					equipments={equipments.data}
					selectedEquipments={selectedEquipments}
					setSelectedEquipments={setSelectedEquipments}
				/>
			)}

			{auth.user?.role === UserRole.EquipmentManager ? (
				<Drawer
					open={isDrawerOpen}
					onOpenChange={(open) => setIsDrawerOpen(open)}
				>
					<DrawerTrigger asChild>
						<Button className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-50 shadow">
							<IconPlus className="h-full" />
							Register Equipment
						</Button>
					</DrawerTrigger>
					<DrawerContent>
						<DrawerHeader>
							<DrawerTitle>Register Equipment</DrawerTitle>
						</DrawerHeader>

						<RegisterEquipmentForm onSuccess={onSuccess} />

						<DrawerFooter>
							<DrawerClose asChild>
								<Button variant="outline">Cancel</Button>
							</DrawerClose>
						</DrawerFooter>
					</DrawerContent>
				</Drawer>
			) : (
				<>
					{selectedEquipments.length > 0 ? (
						<Button
							className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 left-4 z-50 !shadow-item"
							onClick={() => {
								setIsBorrowing(true);
								window.scrollTo({ top: 0, behavior: "instant" });
							}}
						>
							Borrow Equipments ({selectedEquipments.length})
						</Button>
					) : null}
				</>
			)}
		</div>
	);
}
