import { LabelLarge, LabelMedium, LabelSmall } from "@/components/typography";
import { EquipmentStatus, type Equipment } from "@/lib/equipment";
import type { Dispatch, JSX, SetStateAction } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BACKEND_URL } from "@/lib/api";
import { StatusBadge } from "./status-badge";
import type { CheckedState } from "@radix-ui/react-checkbox";
import type { SelectedEquipment } from "..";

type Props = {
	equipments: Equipment[];
	selectedEquipments: SelectedEquipment[];
	setSelectedEquipments: Dispatch<SetStateAction<SelectedEquipment[]>>;
};

export function Catalog(props: Props): JSX.Element {
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
	);
}
