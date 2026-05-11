import {
	categoriesQuery,
	equipmentsQuery,
} from "@/lib/equipment/api";
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
import { EquipmentServerEvent } from "@/lib/equipment/sse";
import type { Equipment } from "@/lib/equipment/model";
import { Success } from "@/components/success";
import { Failed } from "@/components/failed";

const searchSchema = z.object({
	categories: z.array(z.string()).optional().default([]),
	search: z.string().optional(),
});

export const Route = createFileRoute("/_authed/equipments/")({
	component: RouteComponent,
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(equipmentsQuery({ names: [] }));
		context.queryClient.ensureQueryData(categoriesQuery);
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
	const categories = useQuery(categoriesQuery);
	const auth = useAuth();
	const [isBorrowing, setIsBorrowing] = useState(false);
	const [deletionStatus, setDeletionStatus] = useState<"idle" | "success" | "error">("idle");

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
			queryClient.invalidateQueries(categoriesQuery);
		}

		function handleEquipmentRellocation(_: MessageEvent): void {
			queryClient.invalidateQueries(equipmentsQuery({ names: [] }));
		}

		eventSource.addEventListener(
			EquipmentServerEvent.EquipmentCreate,
			handleEquipmentInvalidation,
		);
		eventSource.addEventListener(
			EquipmentServerEvent.EquipmentReallocate,
			handleEquipmentRellocation,
		);

		return () => {
			eventSource.removeEventListener(
				EquipmentServerEvent.EquipmentCreate,
				handleEquipmentInvalidation,
			);
			eventSource.removeEventListener(
				EquipmentServerEvent.EquipmentReallocate,
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

	if (deletionStatus === "error") {
		return (
			<Failed
				header="Equipment deletion failed."
				fn={() => setDeletionStatus("idle")}
				backLink="/equipments"
				backMessage="or return to Catalog"
				className="bg-white fixed md:absolute"
			/>
		);
	}

	if (deletionStatus === "success") {
		return (
			<Success
				header="Equipment has been successfully deleted."
				fn={() => setDeletionStatus("idle")}
				backLink="/equipments"
				className="bg-white fixed md:absolute"
			/>
		);
	}

	return (
		<div className="relative space-y-4 min-w-0 overflow-x-hidden">
			<CatalogHeader user={auth.user!} />
			<CatalogSearch user={auth.user!} />
			<CatalogCategories categories={categories.data?.map(c => c.name) || []} />

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
					onDeletionStatusChange={setDeletionStatus}
				/>
			)}

			{auth.user?.role.code === UserRole.EquipmentManager ? (
				<div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 left-4 z-50 flex flex-row flex-wrap md:flex-col gap-2 md:gap-4 md:w-92 md:left-auto md:right-8 md:bottom-10">
					<Button
						variant="secondary"
						className="flex-1 min-w-[150px] md:flex-none shadow h-auto py-3 whitespace-normal text-center"
						asChild
					>
						<Link to="/equipments/categories">
							Manage Categories
						</Link>
					</Button>
					<Button
						className="flex-1 min-w-[150px] md:flex-none shadow h-auto py-3 whitespace-normal text-center"
						asChild
					>
						<Link
							to="/equipments/$equipmentId/register"
							params={{ equipmentId: uuidv4() }}
						>
							Register Equipment
						</Link>
					</Button>
				</div>
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
