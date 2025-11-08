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
import { BorrowEquipmentForm } from "./-components/borrow-equipment-form";
import { IconArrowLeft, IconPlus } from "@/lib/icons";
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
import { FullScreenLoading } from "@/components/loading";
import { CatalogCategories } from "./-components/catalog-categories";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { DialogClose } from "@radix-ui/react-dialog";

const searchSchema = z.object({
	success: z.boolean().optional(),
	categories: z.array(z.string()).optional().default([]),
	search: z.string().optional(),
});

export const Route = createFileRoute("/_authed/equipments/")({
	component: RouteComponent,
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(equipmentsQuery({ names: [] }));
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

	const equipments = useQuery(
		equipmentsQuery({
			search: search.search,
			names: search.categories,
		}),
	);
	const equipmentNames = useSuspenseQuery(equipmentNamesQuery());
	const auth = useAuth();
	const [isBorrowing, setIsBorrowing] = useState(false);

	const [selectedEquipments, setSelectedEquipments] = useState<
		SelectedEquipment[]
	>([]);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
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
		setIsDialogOpen(false);
		setSelectedEquipments([]);
	}

	const queryClient = useQueryClient();

	useEffect(() => {
		const eventSource = new EventSource(`${BACKEND_URL}/events`);

		function handleEquipmentInvalidation(_: MessageEvent): void {
			queryClient.invalidateQueries(equipmentsQuery({ names: [] }));
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
		return <FullScreenLoading />;
	}

	if (search.success === true) {
		return <BorrowSuccess />;
	}

	if (search.success === false) {
		return (
			<BorrowFailed setIsBorrowing={setIsBorrowing} onSuccess={onSuccess} />
		);
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
				<Dialog
					open={isDialogOpen}
					onOpenChange={(open) => setIsDialogOpen(open)}
				>
					<DialogTrigger asChild>
						<Button className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 left-4 z-50 shadow">
							Register New Equipment
						</Button>
					</DialogTrigger>
					<DialogContent className="p-5" showCloseButton={false}>
						<DialogHeader className="sr-only">
							<DialogTitle>Register Equipment</DialogTitle>
						</DialogHeader>

						<RegisterEquipmentForm onSuccess={onSuccess} />

						<DialogClose className="absolute left-1 top-1" asChild>
							<Button variant="ghost" className="size-15">
								<IconArrowLeft className="size-8" />
							</Button>
						</DialogClose>
					</DialogContent>
				</Dialog>
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
