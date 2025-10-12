import { useAuth } from "@/auth";
import { BACKEND_URL } from "@/lib/api";
import {
	borrowHistoryQuery,
	type BorrowedEquipment,
} from "@/lib/equipment/borrow";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, type JSX } from "react";
import type { CheckedState } from "@radix-ui/react-checkbox";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { Caption } from "@/components/typography";
import { IconRoundArrowUp } from "@/lib/icons";
import { ReturnEquipmentForm } from "./-components/return-equipment-form";
import { Separator } from "@/components/ui/separator";
import {
	returnRequestsQuery,
	type ReturnRequest,
} from "@/lib/equipment/return";
import type { Equipment } from "@/lib/equipment";
import { EmptyState } from "@/components/empty";

export const Route = createFileRoute("/_authed/return/")({
	component: RouteComponent,
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(
			borrowHistoryQuery({ userId: context.session.user.id }),
		);
		context.queryClient.ensureQueryData(
			returnRequestsQuery({ userId: context.session.user.id }),
		);
	},
});

function RouteComponent(): JSX.Element {
	const auth = useAuth();
	const borrowHistory = useSuspenseQuery(
		borrowHistoryQuery({
			userId: auth.user?.id,
		}),
	);
	const returnRequests = useSuspenseQuery(
		returnRequestsQuery({
			userId: auth.user?.id,
		}),
	);

	const currentBorrowedEquipments = borrowHistory.data.flatMap((transaction) =>
		transaction.status === "approved"
			? transaction.equipments.map((equipment) => equipment)
			: [],
	);

	const aggregateEquipments = (data: ReturnRequest[]): Equipment[] =>
		Object.values(
			data
				.flatMap((d) => d.equipments)
				.reduce(
					(acc, eq) => ({
						...acc,
						[eq.id]: acc[eq.id]
							? { ...eq, quantity: acc[eq.id].quantity + eq.quantity }
							: eq,
					}),
					{} as Record<string, Equipment>,
				),
		);

	const equipmentsToReturn = aggregateEquipments(returnRequests.data);

	const [selectedEquipments, setSelectedEquipments] = useState<
		SelectedBorrowedEquipment[]
	>([]);

	function handleSelect(
		equipment: BorrowedEquipment,
		quantity: number,
		checked: CheckedState,
	): void {
		if (!checked) {
			setSelectedEquipments((prev) => {
				return prev.filter(
					(item) =>
						item.equipment.equipmentTypeId !== equipment.equipmentTypeId,
				);
			});
			return;
		}

		setSelectedEquipments((prev) => {
			return [...prev, { equipment: equipment, quantity: quantity }];
		});
	}

	function handleUpdateQuantity(
		equipment: BorrowedEquipment,
		newQuantity: number,
	): void {
		setSelectedEquipments((prev) =>
			prev.map((item) =>
				item.equipment.equipmentTypeId === equipment.equipmentTypeId
					? { ...item, quantity: newQuantity }
					: item,
			),
		);
	}

	return (
		<div className="space-y-4">
			{equipmentsToReturn.length > 0 ? (
				<>
					<RequestedToReturnSection equipments={equipmentsToReturn} />
					<Separator />
				</>
			) : null}

			<BorrowedEquipmentsSection
				equipments={currentBorrowedEquipments}
				selectedEquipments={selectedEquipments}
				onSelect={handleSelect}
			/>

			<Drawer>
				{selectedEquipments.length > 0 ? (
					<DrawerTrigger asChild>
						<Button className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-50 shadow">
							<IconRoundArrowUp className="h-full" />
							Return ({selectedEquipments.length} items)
						</Button>
					</DrawerTrigger>
				) : null}
				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>Selected Equipments</DrawerTitle>
					</DrawerHeader>

					<ReturnEquipmentForm
						selectedEquipments={selectedEquipments}
						className="px-4"
						handleUpdateQuantity={handleUpdateQuantity}
					/>

					<DrawerFooter>
						<DrawerClose asChild>
							<Button variant="outline">Cancel</Button>
						</DrawerClose>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		</div>
	);
}

export type SelectedBorrowedEquipment = {
	equipment: BorrowedEquipment;
	quantity: number;
};

function RequestedToReturnSection({
	equipments,
}: {
	equipments: Equipment[];
}): JSX.Element {
	if (equipments.length === 0) {
		return (
			<section>
				<p className="font-montserrat-medium text-sm mb-1">
					Requested to Return
				</p>
				<EmptyState>
					No equipments for returning yet.
					<br />
					Let's borrow an equipment first.
					<br />
					(´｡• ᵕ •｡`)
				</EmptyState>
			</section>
		);
	}

	return (
		<section>
			<p className="font-montserrat-medium text-sm mb-1">Requested to Return</p>

			<div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
				{equipments.map((equipment) => {
					const key = `${equipment.id}`;
					const equipmentImage = equipment.imageUrl
						? `${BACKEND_URL}${equipment.imageUrl}`
						: "https://arthurmillerfoundation.org/wp-content/uploads/2018/06/default-placeholder.png";

					return (
						<Card
							className="space-y-2 border-input has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-primary has-data-[state=checked]:text-primary-foreground relative flex cursor-pointer flex-col gap-1 rounded-md border p-2 shadow-xs outline-none"
							key={key}
						>
							<div className="space-y-1">
								<div className="w-full h-28 overflow-hidden rounded-md relative bg-background">
									<Badge className="absolute top-1 left-1">
										Borrowed ({equipment.quantity})
									</Badge>
									<img
										src={equipmentImage}
										alt={`${equipment.name} ${equipment.brand}`}
										className="w-full h-full object-cover"
									/>
								</div>

								<div className="flex flex-col">
									<p className="font-montserrat-semibold text-base leading-6">
										{equipment.name}
									</p>

									<Caption>
										{equipment.brand}
										{equipment.model ? " - " : null}
										{equipment.model}
									</Caption>
								</div>
							</div>
						</Card>
					);
				})}
			</div>
		</section>
	);
}

function BorrowedEquipmentsSection({
	equipments,
	selectedEquipments,
	onSelect,
}: {
	equipments: BorrowedEquipment[];
	selectedEquipments: SelectedBorrowedEquipment[];
	onSelect: (
		equipment: BorrowedEquipment,
		quantity: number,
		checked: CheckedState,
	) => void;
}): JSX.Element {
	if (equipments.length === 0) {
		return (
			<section>
				<p className="font-montserrat-medium text-sm mb-1">
					Borrowed Equipments
				</p>
				<EmptyState>
					No borrowed equipments yet.
					<br />
					Let's borrow an equipment first.
					<br />
					(´｡• ᵕ •｡`)
				</EmptyState>
			</section>
		);
	}

	return (
		<section>
			<p className="font-montserrat-medium text-sm mb-1">Borrowed Equipments</p>

			<div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
				{equipments.map((equipment) => {
					const key = `${equipment.borrowRequestItemId}_${equipment.equipmentTypeId}`;
					const equipmentImage = equipment.imageUrl
						? `${BACKEND_URL}${equipment.imageUrl}`
						: "https://arthurmillerfoundation.org/wp-content/uploads/2018/06/default-placeholder.png";
					const isChecked = selectedEquipments.some(
						(item) =>
							item.equipment.equipmentTypeId === equipment.equipmentTypeId,
					);

					return (
						<label htmlFor={key} key={key}>
							<Card className="space-y-2 border-input has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-primary has-data-[state=checked]:text-primary-foreground relative flex cursor-pointer flex-col gap-1 rounded-md border p-2 shadow-xs outline-none">
								<Checkbox
									id={key}
									className="sr-only"
									value={equipment.equipmentTypeId}
									checked={isChecked}
									onCheckedChange={(checked) => onSelect(equipment, 1, checked)}
								/>

								<div className="space-y-1">
									<div className="w-full h-28 overflow-hidden rounded-md relative bg-background">
										<Badge className="absolute top-1 left-1">
											Borrowed ({equipment.quantity})
										</Badge>
										<img
											src={equipmentImage}
											alt={`${equipment.name} ${equipment.brand}`}
											className="w-full h-full object-cover"
										/>
									</div>

									<div className="flex flex-col">
										<p className="font-montserrat-semibold text-base leading-6">
											{equipment.name}
										</p>

										<Caption>
											{equipment.brand}
											{equipment.model ? " - " : null}
											{equipment.model}
										</Caption>
									</div>
								</div>
							</Card>
						</label>
					);
				})}
			</div>
		</section>
	);
}
