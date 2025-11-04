import { NumberInput } from "@/components/number-input";
import { LabelLarge, LabelSmall } from "@/components/typography";
import { BACKEND_URL } from "@/lib/api";
import type {
	BorrowedEquipment,
	BorrowTransaction,
} from "@/lib/equipment/borrow";
import { format } from "date-fns";
import type { JSX } from "react";

type Props = {
	equipment: BorrowedEquipment;
	transaction: BorrowTransaction;
};

export function BorrowedItem(props: Props): JSX.Element {
	const equipmentImage = props.equipment.imageUrl
		? `${BACKEND_URL}${props.equipment.imageUrl}`
		: "https://arthurmillerfoundation.org/wp-content/uploads/2018/06/default-placeholder.png";

	return (
		<div
			key={props.equipment.borrowRequestItemId}
			className="flex items-center gap-2 justify-between bg-card rounded-2xl p-4 shadow-item"
		>
			<div className="flex items-center gap-2 w-full">
				<img
					src={equipmentImage}
					alt={`${props.equipment.name} ${props.equipment.brand}`}
					className="size-16 object-cover"
				/>

				<div className="flex flex-col w-full">
					<LabelLarge>
						{props.equipment.brand}
						{props.equipment.model ? ` ${props.equipment.model}` : null}
					</LabelLarge>

					<LabelSmall className="text-muted">
						Due: {format(props.transaction.expectedReturnAt, "h:mm a")} on{" "}
						{format(props.transaction.expectedReturnAt, "MM/dd/yyyy")}
					</LabelSmall>
				</div>
			</div>

			<NumberInput className="w-40" value={props.equipment.quantity} maxValue={props.equipment.quantity} isReadOnly />
		</div>
	);
}
