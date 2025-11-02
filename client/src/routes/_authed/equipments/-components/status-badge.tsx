import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toImageUrl } from "@/lib/api";
import { EquipmentStatus, type Equipment } from "@/lib/equipment";
import { capitalizeWords } from "@/lib/utils";
import type { JSX } from "react";

type Props = {
	equipment: Equipment;
};

export function StatusBadge(props: Props): JSX.Element {
	return (
		<Badge
			className="absolute top-1 right-1 h-7.5"
			variant={
				props.equipment.status === EquipmentStatus.Available
					? "success"
					: "warning"
			}
		>
			{capitalizeWords(props.equipment.status)}

			{!props.equipment.borrower ? (
				<span>{props.equipment.quantity} units</span>
			) : (
				<Avatar className="size-5 text-xs ml-1">
					<AvatarImage src={toImageUrl(props.equipment.borrower.avatarUrl)} />
					<AvatarFallback>
						{props.equipment.borrower.firstName[0]}
						{props.equipment.borrower.lastName[0]}
					</AvatarFallback>
				</Avatar>
			)}
		</Badge>
	);
}
