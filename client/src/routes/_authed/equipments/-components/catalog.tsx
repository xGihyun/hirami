import { LabelLarge, LabelMedium, LabelSmall } from "@/components/typography";
import { EquipmentStatus, type Equipment } from "@/lib/equipment";
import type { Dispatch, JSX, SetStateAction } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BACKEND_URL } from "@/lib/api";
import { StatusBadge } from "./status-badge";
import type { CheckedState } from "@radix-ui/react-checkbox";
import type { SelectedEquipment } from "..";
import { useAuth } from "@/auth";
import { UserRole } from "@/lib/user";
import { Link, useNavigate } from "@tanstack/react-router";

type Props = {
	equipments: Equipment[];
	selectedEquipments: SelectedEquipment[];
	setSelectedEquipments: Dispatch<SetStateAction<SelectedEquipment[]>>;
};

export function Catalog(props: Props): JSX.Element {
	const auth = useAuth();
	const navigate = useNavigate({ from: "/equipments" });

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

	const isEquipmentManager = auth.user?.role === UserRole.EquipmentManager;

	if (props.equipments.length === 0) {
		return (
			<LabelMedium className="text-muted text-center mt-10">
				No equipment found
			</LabelMedium>
		);
	}

	return (
		<section className="pb-15 !mb-0">
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
				{props.equipments.map((equipment) => {
					const key = `${equipment.id}-${equipment.status}`;
					const equipmentImage = equipment.imageUrl
						? `${BACKEND_URL}${equipment.imageUrl}`
						: "https://arthurmillerfoundation.org/wp-content/uploads/2018/06/default-placeholder.png";

					const CardContent = (
						<Card className="group space-y-2 border-input has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-primary has-data-[state=checked]:text-primary-foreground relative flex cursor-pointer flex-col gap-1 rounded-md border p-2 shadow-xs outline-none">
							{/* Checkbox for non-managers, invisible to managers */}
							<Checkbox
								id={key}
								checked={isChecked(equipment)}
								className={`sr-only ${isEquipmentManager ? "hidden" : ""}`}
								value={equipment.id}
								onCheckedChange={(checked) =>
									handleSelect(equipment, 1, checked)
								}
								disabled={equipment.status !== EquipmentStatus.Available}
							/>

							<div className="space-y-1">
								<div className="w-full h-28 overflow-hidden rounded-md relative">
									<StatusBadge equipment={equipment} />
									<img
										src={equipmentImage}
										alt={`${equipment.name} ${equipment.brand}`}
										className="w-full object-contain aspect-[164/112]"
									/>
								</div>
								<div className="flex flex-col">
									<LabelLarge>
										{equipment.brand ? equipment.brand : "No Brand"}
										{equipment.model ? " " : null}
										{equipment.model}
									</LabelLarge>
									<LabelSmall className="text-muted group-has-data-[state=checked]:text-primary-foreground">
										{equipment.name}
									</LabelSmall>
								</div>
							</div>
						</Card>
					);

					// Manager sees a Link for editing
					if (isEquipmentManager) {
						return (
							<Link
								key={key}
								to="/equipments/$equipmentId/edit"
								params={{ equipmentId: equipment.id }}
							>
								{CardContent}
							</Link>
						);
					}

					// Other users see a selectable label
					return (
						<label
							htmlFor={key}
							key={key}
							className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md"
						>
							{CardContent}
						</label>
					);
				})}
			</div>
		</section>
	);
}
