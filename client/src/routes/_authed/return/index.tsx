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

export const Route = createFileRoute("/_authed/return/")({
	component: RouteComponent,
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(
			borrowHistoryQuery({ userId: context.auth.user?.id }),
		);
	},
});

export type SelectedBorrowedEquipment = {
	equipment: BorrowedEquipment;
	quantity: number;
};

function RouteComponent(): JSX.Element {
	const auth = useAuth();
	const borrowHistory = useSuspenseQuery(
		borrowHistoryQuery({
			userId: auth.user?.id,
		}),
	);

	const currentBorrowedEquipments = borrowHistory.data.flatMap((transaction) =>
		transaction.status === "approved"
			? transaction.equipments.map((equipment) => equipment)
			: [],
	);

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
		<div>
			<section>
				<p className="font-montserrat-medium text-sm mb-1">Equipments</p>

				<div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
					{currentBorrowedEquipments.map((equipment) => {
						const key = `${equipment.borrowRequestItemId}_${equipment.equipmentTypeId}`;
						const equipmentImage = equipment.imageUrl
							? `${BACKEND_URL}${equipment.imageUrl}`
							: "https://arthurmillerfoundation.org/wp-content/uploads/2018/06/default-placeholder.png";

						return (
							<label htmlFor={key} key={key}>
								<Card className="space-y-2 border-input has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-primary has-data-[state=checked]:text-primary-foreground relative flex cursor-pointer flex-col gap-1 rounded-md border p-2 shadow-xs outline-none">
									<Checkbox
										id={key}
										className="sr-only"
										value={equipment.equipmentTypeId}
										onCheckedChange={(checked) =>
											handleSelect(equipment, 1, checked)
										}
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
