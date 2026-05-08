import { Badge } from "@/components/ui/badge";
import { EquipmentStatus, type Equipment } from "@/lib/equipment/model";
import { capitalizeWords, getEquipmentBadgeVariant } from "@/lib/utils";
import type { JSX } from "react";

type Props = {
	equipment: Equipment;
};

export function StatusBadge(props: Props): JSX.Element {
	return (
		<Badge
			className="absolute top-1 right-1 h-7.5"
			variant={getEquipmentBadgeVariant(props.equipment.status.code)}
		>
			{props.equipment.status.code === EquipmentStatus.Maintenance
				? "For Repair"
				: capitalizeWords(props.equipment.status.code)}

			<span>({props.equipment.quantity} units)</span>
		</Badge>
	);
}
