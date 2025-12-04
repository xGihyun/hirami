import {
	equipmentNamesQuery,
	equipmentsQuery,
	type Equipment,
} from "@/lib/equipment";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { BACKEND_URL } from "@/lib/api";
import { useEffect, useState, type JSX } from "react";
import { BorrowEquipmentForm } from "./-components/borrow-equipment-form";
import { useAuth } from "@/auth";
import { UserRole } from "@/lib/user";
import { EventSource } from "eventsource";
import { CatalogHeader } from "./-components/catalog-header";
import { CatalogSearch } from "./-components/catalog-search";
import z from "zod";
import { Catalog } from "./-components/catalog";
import { LabelMedium } from "@/components/typography";
import { CatalogCategories } from "./-components/catalog-categories";
import { v4 as uuidv4 } from "uuid";
import { ComponentLoading } from "@/components/loading";

const searchSchema = z.object({
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
	const equipmentNames = useQuery(equipmentNamesQuery());
	const auth = useAuth();
	const [isBorrowing, setIsBorrowing] = useState(false);

	const [selectedEquipments, setSelectedEquipments] = useState<
		SelectedEquipment[]
	>([]);

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
		setSelectedEquipments([]);
	}

	const queryClient = useQueryClient();

	useEffect(() => {
		const eventSource = new EventSource(`${BACKEND_URL}/events`);

		function handleEquipmentInvalidation(_: MessageEvent): void {
			queryClient.invalidateQueries(equipmentsQuery({ names: [] }));
			queryClient.invalidateQueries(equipmentNamesQuery());
		}

		function handleEquipmentRellocation(_: MessageEvent): void {
			queryClient.invalidateQueries(equipmentsQuery({ names: [] }));
		}

		eventSource.addEventListener(
			"equipment:create",
			handleEquipmentInvalidation,
		);
		eventSource.addEventListener(
			"equipment:reallocate",
			handleEquipmentRellocation,
		);

		return () => {
			eventSource.removeEventListener(
				"equipment:create",
				handleEquipmentInvalidation,
			);
			eventSource.removeEventListener(
				"equipment:reallocate",
				handleEquipmentRellocation,
			);
			eventSource.close();
		};
	}, []);

	if (isBorrowing) {
		return (
			<BorrowEquipmentForm
				handleUpdateQuantity={handleUpdateQuantity}
				reset={onSuccess}
				selectedEquipments={selectedEquipments}
				setIsBorrowing={setIsBorrowing}
			/>
		);
	}

	return (
		<div className="relative space-y-4">
			<CatalogHeader user={auth.user!} />
			<CatalogSearch user={auth.user!} />
			<CatalogCategories categories={equipmentNames.data || []} />

			{equipments.isPending ? (
				<ComponentLoading />
			) : equipments.isError || equipments.data === undefined ? (
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

			{auth.user?.role.code === UserRole.EquipmentManager ? (
				<Button
					className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 left-4 z-50 shadow"
					asChild
				>
					<Link
						to="/equipments/$equipmentId/register/name"
						params={{ equipmentId: uuidv4() }}
					>
						Register New Equipment
					</Link>
				</Button>
			) : selectedEquipments.length > 0 ? (
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
		</div>
	);
}
