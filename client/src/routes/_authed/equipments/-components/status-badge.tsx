import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { EquipmentStatus, type Equipment } from "@/lib/equipment/model";
import { capitalizeWords } from "@/lib/utils";
import type { JSX } from "react";

type Props = {
	equipment: Equipment;
};

export function StatusBadge(props: Props): JSX.Element {
	function getBadgeVariant(status: EquipmentStatus): BadgeVariant {
		switch (status) {
			case EquipmentStatus.Available:
				return "success";
			case EquipmentStatus.Borrowed:
				return "warning";
		}

		return "default";
	}

	return (
		<Badge
			className="absolute top-1 right-1 h-7.5"
			variant={getBadgeVariant(props.equipment.status.code)}
		>
			{capitalizeWords(props.equipment.status.code)}

			<span>({props.equipment.quantity} units)</span>
		</Badge>
	);
}
