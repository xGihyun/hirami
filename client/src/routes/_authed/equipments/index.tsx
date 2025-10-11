import { equipmentsQuery, type Equipment } from "@/lib/equipment";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { RegisterEquipmentForm } from "./-components/register-equipment-form";
import { Button } from "@/components/ui/button";
import { BACKEND_URL } from "@/lib/api";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, type JSX } from "react";
import type { CheckedState } from "@radix-ui/react-checkbox";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { BorrowEquipmentForm } from "./-components/borrow-equipment-form";
import { NumberInput } from "@/components/number-input";
import { H1 } from "@/components/typography";

export const Route = createFileRoute("/_authed/equipments/")({
	component: RouteComponent,
	loader: ({ context }) => {
		const equipments = context.queryClient.ensureQueryData(equipmentsQuery);
		return equipments;
	},
});

export type SelectedEquipment = {
	equipment: Equipment;
	quantity: number;
};

function RouteComponent(): JSX.Element {
	const { data } = useSuspenseQuery(equipmentsQuery);
	const [selectedEquipments, setSelectedEquipments] = useState<
		SelectedEquipment[]
	>([]);
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);

	function handleSelect(
		equipment: Equipment,
		quantity: number,
		checked: CheckedState,
	): void {
		if (!checked) {
			setSelectedEquipments((prev) => {
				return prev.filter((item) => item.equipment.id !== equipment.id);
			});
			return;
		}

		setSelectedEquipments((prev) => {
			return [...prev, { equipment: equipment, quantity: quantity }];
		});
	}

	function handleQuantityChange(
		equipment: Equipment,
		newQuantity: number,
	): void {
		if (newQuantity < 1) return;
		if (newQuantity > equipment.quantity) return;

		setSelectedEquipments((prev) =>
			prev.map((item) =>
				item.equipment.id === equipment.id
					? { ...item, quantity: newQuantity }
					: item,
			),
		);
	}

	return (
		<div className="px-4 lg:px-10 py-5 relative pb-20">
			<H1>Equipments</H1>

			<Dialog>
				<DialogTrigger asChild>
					<Button>Register Equipment</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Register Equipment</DialogTitle>
						<RegisterEquipmentForm />
					</DialogHeader>
				</DialogContent>
			</Dialog>

			<div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
				{data.map((equipment) => {
					const key = `${equipment.id}-${equipment.status}`;
					const equipmentImage = equipment.imageUrl
						? `${BACKEND_URL}${equipment.imageUrl}`
						: "https://arthurmillerfoundation.org/wp-content/uploads/2018/06/default-placeholder.png";
					const isSelected = selectedEquipments.some(
						(item) => item.equipment.id === equipment.id,
					);
					return (
						<label htmlFor={key} key={key}>
							<Card className="border-input has-data-[state=checked]:border-primary/50 relative flex cursor-pointer flex-col gap-4 rounded-md border p-4 shadow-xs outline-none">
								<Checkbox
									id={key}
									className="sr-only"
									value={equipment.id}
									// TODO: Adjust quantity
									onCheckedChange={(checked) =>
										handleSelect(equipment, 1, checked)
									}
								/>
								<CardHeader>
									<img src={equipmentImage} alt="equipment image" />
									<CardTitle>{equipment.name}</CardTitle>
									{equipment.brand ? (
										<CardDescription>{equipment.brand}</CardDescription>
									) : null}
								</CardHeader>
								<CardContent>
									<p>Quantity: {equipment.quantity}</p>
									<Badge variant={equipment.borrower ? "secondary" : "default"}>
										{equipment.status}
									</Badge>
									{equipment.borrower ? (
										<p>
											Borrowed By: {equipment.borrower.firstName}{" "}
											{equipment.borrower.lastName}
										</p>
									) : null}

									{isSelected ? (
										<NumberInput
											onChange={(v) => handleQuantityChange(equipment, v)}
											maxValue={equipment.quantity}
										/>
									) : null}
								</CardContent>
							</Card>
						</label>
					);
				})}
			</div>

			{/* <div className="fixed bottom-0 left-0 w-full bg-background p-4 shadow pb-[calc(1rem+env(safe-area-inset-bottom))]"> */}
			{/* 	<Button */}
			{/* 		className="w-full" */}
			{/* 		onClick={() => { */}
			{/* 			if (selectedEquipments.length === 0) { */}
			{/* 				alert("Please select at least one equipment item to borrow."); */}
			{/* 				return; */}
			{/* 			} */}
			{/* 			setIsDrawerOpen(true); */}
			{/* 		}} */}
			{/* 	> */}
			{/* 		Borrow ({selectedEquipments.length} items) */}
			{/* 	</Button> */}
			{/* </div> */}

			<Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>Borrow Equipments</DrawerTitle>
						<DrawerDescription>Insert description</DrawerDescription>
					</DrawerHeader>

					<BorrowEquipmentForm
						selectedEquipments={selectedEquipments}
						className="px-4"
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
