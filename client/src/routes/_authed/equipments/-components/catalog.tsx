import { LabelLarge, LabelMedium, LabelSmall } from "@/components/typography";
import { DEFAULT_EQUIPMENT_IMAGE } from "@/lib/equipment/constant";
import {
	EquipmentStatus,
	type Equipment,
	type EquipmentWithBorrower,
} from "@/lib/equipment/model";
import type { Dispatch, JSX, SetStateAction } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toImageUrl } from "@/lib/api";
import { StatusBadge } from "./status-badge";
import type { CheckedState } from "@radix-ui/react-checkbox";
import type { SelectedEquipment } from "..";
import { useAuth } from "@/auth";
import { UserRole } from "@/lib/user";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
	equipments: EquipmentWithBorrower[];
	selectedEquipments: SelectedEquipment[];
	setSelectedEquipments: Dispatch<SetStateAction<SelectedEquipment[]>>;
};

export function Catalog(props: Props): JSX.Element {
	const auth = useAuth();

	function handleSelect(
		equipment: Equipment,
		quantity: number,
		checked: CheckedState,
	): void {
		if (!checked) {
			props.setSelectedEquipments((prev) => {
				return prev.filter((item) => item.equipment.id !== equipment.id);
			});
			return;
		}

		props.setSelectedEquipments((prev) => {
			return [...prev, { equipment: equipment, quantity: quantity }];
		});
	}

	function isChecked(equipment: Equipment): boolean {
		return props.selectedEquipments.some(
			(item) =>
				item.equipment.id === equipment.id &&
				item.equipment.status === equipment.status,
		);
	}

	const isEquipmentManager = auth.user?.role.code === UserRole.EquipmentManager;

	if (props.equipments.length === 0) {
		return (
			<LabelMedium className="text-muted text-center mt-10">
				No equipment found
			</LabelMedium>
		);
	}

	return (
		<section className="pb-15 !mb-0">
			<div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-2">
				{props.equipments.map(({ equipment }) => {
					const key = `${equipment.id}-${equipment.status?.code}`;
					const equipmentImage = equipment.imageUrl
						? toImageUrl(equipment.imageUrl)
						: DEFAULT_EQUIPMENT_IMAGE;

					const cardContent = (className?: string) => (
						<Card
							className={cn(
								"group space-y-2 border-input has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-primary has-data-[state=checked]:text-primary-foreground relative flex cursor-pointer flex-col gap-1 rounded-md border p-2 shadow-xs outline-none",
								"md:bg-background",
								className,
							)}
						>
							{!isEquipmentManager && (
								<Checkbox
									id={key}
									checked={isChecked(equipment)}
									className="sr-only"
									value={equipment.id}
									onCheckedChange={(checked) =>
										handleSelect(equipment, 1, checked)
									}
									disabled={
										equipment.status?.code !== EquipmentStatus.Available
									}
								/>
							)}

							<div className="space-y-1">
								<div className="w-full h-28 overflow-hidden rounded-md relative">
									<StatusBadge equipment={equipment} />
									<img
										src={equipmentImage}
										alt={`${equipment.name} ${equipment.brand}`}
										className="w-full object-contain aspect-[164/112] h-full"
									/>
								</div>
								<div className="flex flex-col">
									<LabelLarge className="line-clamp-1">
										{equipment.brand ? equipment.brand : "No Brand"}
										{equipment.model ? " " : null}
										{equipment.model}
									</LabelLarge>
									<LabelSmall className="text-muted group-has-data-[state=checked]:text-primary-foreground line-clamp-1">
										{equipment.name}
									</LabelSmall>
								</div>
							</div>
						</Card>
					);

					if (
						isEquipmentManager &&
						(equipment.status?.code === EquipmentStatus.Borrowed ||
							equipment.status?.code === EquipmentStatus.Reserved)
					) {
						return (
							<Dialog>
								<DialogTrigger>
									{cardContent(
										"text-start hover:bg-tertiary transition active:bg-tertiary",
									)}
								</DialogTrigger>

								<DialogContent>
									<DialogHeader>
										<DialogTitle>
											{equipment.brand} {equipment.model}
										</DialogTitle>
										<DialogDescription>{equipment.name}</DialogDescription>
									</DialogHeader>

									<div className="flex gap-2">
										<Button asChild>
											<Link
												key={key}
												to="/equipments/$equipmentId/edit"
												params={{ equipmentId: equipment.id }}
											>
												Edit Equipment
											</Link>
										</Button>

										<Button variant="secondary" asChild>
											<Link
												key={key}
												to="/equipments/$equipmentId"
												params={{ equipmentId: equipment.id }}
											>
												View Borrowers
											</Link>
										</Button>
									</div>
								</DialogContent>
							</Dialog>
						);
					}

					if (isEquipmentManager) {
						return (
							<Link
								key={key}
								to="/equipments/$equipmentId/edit"
								params={{ equipmentId: equipment.id }}
							>
								{cardContent("hover:bg-tertiary transition active:bg-tertiary")}
							</Link>
						);
					}

					if (
						equipment.status?.code === EquipmentStatus.Borrowed ||
						equipment.status?.code === EquipmentStatus.Reserved
					) {
						return (
							<Link
								key={key}
								to="/equipments/$equipmentId"
								params={{ equipmentId: equipment.id }}
							>
								{cardContent("hover:bg-tertiary transition active:bg-tertiary")}
							</Link>
						);
					}

					return (
						<label
							htmlFor={key}
							key={key}
							className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md"
						>
							{cardContent()}
						</label>
					);
				})}
			</div>
		</section>
	);
}
