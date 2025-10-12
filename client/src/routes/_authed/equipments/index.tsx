import {
	equipmentNamesQuery,
	equipmentsQuery,
	EquipmentStatus,
	type Equipment,
} from "@/lib/equipment";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BACKEND_URL, toImageUrl } from "@/lib/api";
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
import { BorrowEquipmentForm } from "./-components/borrow-equipment-form";
import { Caption } from "@/components/typography";
import { IconPlus, IconRoundArrowDown } from "@/lib/icons";
import { Toggle } from "@/components/ui/toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/auth";
import { UserRole } from "@/lib/user";
import { RegisterEquipmentForm } from "./-components/register-equipment-form";

export const Route = createFileRoute("/_authed/equipments/")({
	component: RouteComponent,
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(equipmentsQuery());
		context.queryClient.ensureQueryData(equipmentNamesQuery());
	},
});

export type SelectedEquipment = {
	equipment: Equipment;
	quantity: number;
};

function RouteComponent(): JSX.Element {
	const [selectedNames, setSelectedNames] = useState<string[]>([]);

	const equipments = useQuery(equipmentsQuery(selectedNames));
	const equipmentNames = useSuspenseQuery(equipmentNamesQuery());
	const auth = useAuth();

	function toggleEquipment(name: string): void {
		setSelectedNames((prev) =>
			prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
		);
	}

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
		setIsDrawerOpen(false);
		setSelectedEquipments([]);
	}

	// TODO: Fix these stuff, make the approach cleaner
	if (equipments.isPending || !equipments.data) {
		return <p>Loading Equipment...</p>;
	}

	return (
		<div className="relative space-y-4">
			<section className="flex gap-2 items-center">
				<Avatar className="size-12">
					<AvatarImage src={toImageUrl(auth.user?.avatarUrl)} />
					<AvatarFallback>
						{auth.user?.firstName[0]}
						{auth.user?.lastName[0]}
					</AvatarFallback>
				</Avatar>

				<div>
					<p className="text-sm font-montserrat-medium">Welcome back,</p>
					<p className="text-xl font-montserrat-medium">
						{auth.user?.firstName}
					</p>
				</div>
			</section>

			<section>
				<p className="font-montserrat-medium text-sm mb-1">Categories</p>
				<div className="flex flex-wrap gap-2 mb-2">
					{equipmentNames.data.map((name) => (
						<Toggle
							key={name}
							variant="outline"
							pressed={selectedNames.includes(name)}
							onPressedChange={() => toggleEquipment(name)}
						>
							{name}
						</Toggle>
					))}
				</div>
			</section>

			<section>
				<p className="font-montserrat-medium text-sm mb-1">Equipments</p>

				<div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
					{equipments.data.map((equipment) => {
						const key = `${equipment.id}-${equipment.status}`;
						const equipmentImage = equipment.imageUrl
							? `${BACKEND_URL}${equipment.imageUrl}`
							: "https://arthurmillerfoundation.org/wp-content/uploads/2018/06/default-placeholder.png";
						const borrowerInitials = `${equipment.borrower?.firstName[0]}${equipment.borrower?.lastName[0]}`;
						const borrowerName = `${equipment.borrower?.lastName}, ${equipment.borrower?.firstName}`;

						return (
							<label htmlFor={key} key={key}>
								<Card className="space-y-2 border-input has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-primary has-data-[state=checked]:text-primary-foreground relative flex cursor-pointer flex-col gap-1 rounded-md border p-2 shadow-xs outline-none">
									<Checkbox
										id={key}
										checked={selectedEquipments.some(
											(item) =>
												item.equipment.id === equipment.id &&
												item.equipment.status === equipment.status,
										)}
										className="sr-only"
										value={equipment.id}
										onCheckedChange={(checked) =>
											handleSelect(equipment, 1, checked)
										}
										disabled={
											equipment.status == EquipmentStatus.Borrowed ||
											auth.user?.role !== UserRole.Borrower
										}
									/>

									<div className="space-y-1">
										<div className="w-full h-28 overflow-hidden rounded-md relative bg-background">
											<Badge
												className="absolute top-1 left-1"
												variant={
													equipment.status === EquipmentStatus.Available
														? "success"
														: "default"
												}
											>
												{equipment.status} ({equipment.quantity})
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

									{equipment.borrower ? (
										<div className="flex items-center gap-1">
											<Avatar className="size-6 text-xs">
												<AvatarImage src={toImageUrl(equipment.borrower.avatarUrl)} />
												<AvatarFallback>{borrowerInitials}</AvatarFallback>
											</Avatar>

											<Caption>{borrowerName}</Caption>
										</div>
									) : null}
								</Card>
							</label>
						);
					})}
				</div>
			</section>

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

						<RegisterEquipmentForm />

						<DrawerFooter>
							<DrawerClose asChild>
								<Button variant="outline">Cancel</Button>
							</DrawerClose>
						</DrawerFooter>
					</DrawerContent>
				</Drawer>
			) : (
				<Drawer
					open={isDrawerOpen}
					onOpenChange={(open) => setIsDrawerOpen(open)}
				>
					{selectedEquipments.length > 0 ? (
						<DrawerTrigger asChild>
							<Button className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-50 shadow">
								<IconRoundArrowDown className="h-full" />
								Borrow ({selectedEquipments.length} items)
							</Button>
						</DrawerTrigger>
					) : null}
					<DrawerContent>
						<DrawerHeader>
							<DrawerTitle>Selected Equipments</DrawerTitle>
						</DrawerHeader>

						<BorrowEquipmentForm
							selectedEquipments={selectedEquipments}
							className="px-4"
							handleUpdateQuantity={handleUpdateQuantity}
							onSuccess={onSuccess}
						/>

						<DrawerFooter>
							<DrawerClose asChild>
								<Button variant="outline">Cancel</Button>
							</DrawerClose>
						</DrawerFooter>
					</DrawerContent>
				</Drawer>
			)}
		</div>
	);
}
