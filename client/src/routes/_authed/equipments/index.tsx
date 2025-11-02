import {
	equipmentNamesQuery,
	equipmentsQuery,
	EquipmentStatus,
	type Equipment,
} from "@/lib/equipment";
import {
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BACKEND_URL, toImageUrl } from "@/lib/api";
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
import { BorrowEquipmentForm } from "./-components/borrow-equipment-form";
import {
	Caption,
	H2,
	LabelLarge,
	LabelMedium,
	LabelSmall,
	TitleSmall,
} from "@/components/typography";
import { IconPlus, IconRoundArrowDown } from "@/lib/icons";
import { Toggle } from "@/components/ui/toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/auth";
import { UserRole } from "@/lib/user";
import { RegisterEquipmentForm } from "./-components/register-equipment-form";
import { EventSource } from "eventsource";
import { CatalogHeader } from "./-components/header";
import { CatalogSearch } from "./-components/search";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { capitalizeWords } from "@/lib/utils";
import { StatusBadge } from "./-components/status-badge";

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
	const [isBorrowing, setIsBorrowing] = useState(false);

	function toggleEquipment(name: string): void {
		if (name === "All") {
			setSelectedNames([]);
			return;
		}

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

	function isChecked(equipment: Equipment): boolean {
		return selectedEquipments.some(
			(item) =>
				item.equipment.id === equipment.id &&
				item.equipment.status === equipment.status,
		);
	}

	// TODO: Fix these stuff, make the approach cleaner
	if (equipments.isPending || !equipments.data) {
		return <p>Loading Equipment...</p>;
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

			<section className="mb-2">
				<div className="mb-2.5 flex items-center justify-between gap-2">
					<TitleSmall>Categories</TitleSmall>

					<button className="cursor-pointer">
						<LabelMedium>See More</LabelMedium>
					</button>
				</div>

				<ScrollArea>
					<div className="flex gap-2 mb-2">
						<Toggle
							key={"All"}
							variant="outline"
							onPressedChange={() => toggleEquipment("All")}
							pressed={selectedNames.length === 0}
						>
							All
						</Toggle>

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

					<ScrollBar orientation="horizontal" />
				</ScrollArea>
			</section>

			<section className="pb-12">
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
					{equipments.data.map((equipment) => {
						const key = `${equipment.id}-${equipment.status}`;
						const equipmentImage = equipment.imageUrl
							? `${BACKEND_URL}${equipment.imageUrl}`
							: "https://arthurmillerfoundation.org/wp-content/uploads/2018/06/default-placeholder.png";

						return (
							<label htmlFor={key} key={key}>
								<Card className="group space-y-2 border-input has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-primary has-data-[state=checked]:text-primary-foreground relative flex cursor-pointer flex-col gap-1 rounded-md border p-2 shadow-xs outline-none">
									<Checkbox
										id={key}
										checked={isChecked(equipment)}
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
										<div className="w-full h-28 overflow-hidden rounded-md relative">
											<StatusBadge equipment={equipment} />

											<img
												src={equipmentImage}
												alt={`${equipment.name} ${equipment.brand}`}
												className="w-full h-full object-contain"
											/>
										</div>

										<div className="flex flex-col">
											<LabelLarge>
												{equipment.brand}
												{equipment.model ? " - " : null}
												{equipment.model}
											</LabelLarge>

											<LabelSmall className="text-muted group-has-data-[state=checked]:text-primary-foreground">
												{equipment.name}
											</LabelSmall>
										</div>
									</div>
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
							className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 left-4 z-50 shadow"
							onClick={() => setIsBorrowing(true)}
						>
							Borrow Equipments ({selectedEquipments.length})
						</Button>
					) : null}
				</>
			)}
		</div>
	);
}
