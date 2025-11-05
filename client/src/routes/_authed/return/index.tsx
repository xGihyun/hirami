import { useAuth } from "@/auth";
import { BACKEND_URL, Sort } from "@/lib/api";
import {
	borrowHistoryQuery,
	type BorrowedEquipment,
} from "@/lib/equipment/borrow";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect, useState, type JSX } from "react";
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
import { Caption, H2 } from "@/components/typography";
import { IconRoundArrowUp } from "@/lib/icons";
import { ReturnEquipmentForm } from "./-components/return-equipment-form";
import { Separator } from "@/components/ui/separator";
import {
	returnRequestsQuery,
	type ReturnRequest,
} from "@/lib/equipment/return";
import { equipmentNamesQuery, type Equipment } from "@/lib/equipment";
import { EmptyState } from "@/components/empty";
import { EventSource } from "eventsource";
import { ReturnHeader } from "./-components/return-header";
import z from "zod";
import { ReturnTab } from "./-model";
import { BorrowedItem } from "./-components/borrowed-item";

const searchSchema = z.object({
	tab: z.enum(ReturnTab).default(ReturnTab.BorrowedItems),
	category: z.string().optional(),
	dueDateSort: z.enum(Sort).default(Sort.Desc),
});

export const Route = createFileRoute("/_authed/return/")({
	component: RouteComponent,
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(
			borrowHistoryQuery({ userId: context.session.user.id }),
		);
		context.queryClient.ensureQueryData(
			returnRequestsQuery({ userId: context.session.user.id }),
		);
		context.queryClient.ensureQueryData(equipmentNamesQuery());
	},
	validateSearch: searchSchema,
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
	const equipmentNames = useSuspenseQuery(equipmentNamesQuery());

	const currentTransactions = borrowHistory.data.flatMap((transaction) =>
		transaction.status === "approved" ? transaction : [],
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

	const queryClient = useQueryClient();

	useEffect(() => {
		const eventSource = new EventSource(`${BACKEND_URL}/events`);

		function handleEvent(_: MessageEvent): void {
			queryClient.ensureQueryData(
				borrowHistoryQuery({ userId: auth.user?.id }),
			);
			queryClient.ensureQueryData(
				returnRequestsQuery({ userId: auth.user?.id }),
			);
		}

		eventSource.addEventListener("equipment:create", handleEvent);

		return () => {
			eventSource.removeEventListener("equipment:create", handleEvent);
			eventSource.close();
		};
	}, [queryClient]);

	return (
		<div className="space-y-4">
			<ReturnHeader equipmentNames={equipmentNames.data} />

			{currentTransactions.map((transaction) => (
				<div className="flex flex-col gap-3.5">
					{transaction.equipments.map((equipment) => {
						const isChecked = selectedEquipments.some(
							(item) =>
								item.equipment.borrowRequestItemId ===
								equipment.borrowRequestItemId,
						);

						return (
							<button
								key={equipment.borrowRequestItemId}
								className="group text-start"
								onClick={() => handleSelect(equipment, 1, !isChecked)}
							>
								<Checkbox
									id={equipment.borrowRequestItemId}
									className="sr-only"
									value={equipment.borrowRequestItemId}
									checked={isChecked}
									onCheckedChange={(checked) =>
										handleSelect(equipment, 1, checked)
									}
								/>

								<BorrowedItem
									equipment={equipment}
									transaction={transaction}
									className="cursor-pointer group-has-data-[state=checked]:bg-primary group-has-data-[state=checked]:text-primary-foreground"
								/>
							</button>
						);
					})}
				</div>
			))}

			{selectedEquipments.length > 0 ? (
				<Button className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 left-4 z-50 !shadow-item">
					Return Equipments ({selectedEquipments.length})
				</Button>
			) : null}
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
		<section className="space-y-4">
			<H2>Returning Equipments</H2>

			<Separator />

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
			<section className="h-[40rem]">
				<H2>Borrowed Equipments</H2>

				<div className="flex h-full items-center justify-center">
					<EmptyState>
						No borrowed equipments yet.
						<br />
						Let's borrow an equipment first.
						<br />
						(´｡• ᵕ •｡`)
					</EmptyState>
				</div>
			</section>
		);
	}

	return (
		<section className="space-y-4">
			<H2>Borrowed Equipments</H2>

			<Separator />

			<div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
				{equipments.map((equipment) => {
					{
						/* const key = `${equipment.borrowRequestItemId}_${equipment.equipmentTypeId}`; */
					}
					const equipmentImage = equipment.imageUrl
						? `${BACKEND_URL}${equipment.imageUrl}`
						: "https://arthurmillerfoundation.org/wp-content/uploads/2018/06/default-placeholder.png";
					const isChecked = selectedEquipments.some(
						(item) =>
							item.equipment.borrowRequestItemId ===
							equipment.borrowRequestItemId,
					);

					return (
						<label
							htmlFor={equipment.borrowRequestItemId}
							key={equipment.borrowRequestItemId}
						>
							<Card className="space-y-2 border-input has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-primary has-data-[state=checked]:text-primary-foreground relative flex cursor-pointer flex-col gap-1 rounded-md border p-2 shadow-xs outline-none">
								<Checkbox
									id={equipment.borrowRequestItemId}
									className="sr-only"
									value={equipment.borrowRequestItemId}
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
