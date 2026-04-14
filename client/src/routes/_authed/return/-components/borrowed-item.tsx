import { NumberInput } from "@/components/number-input";
import { LabelLarge, LabelSmall } from "@/components/typography";
import { Badge } from "@/components/ui/badge";
import { BACKEND_URL } from "@/lib/api";
import type {
	BorrowRequestItem,
	BorrowRequest,
} from "@/lib/equipment/model";
import { cn } from "@/lib/utils";
import { differenceInMinutes, format, isAfter } from "date-fns";
import type { JSX } from "react";

type Props = {
	item: BorrowRequestItem;
	transaction: BorrowRequest;
	handleUpdateQuantity: (
		equipment: BorrowRequestItem,
		newQuantity: number,
	) => void;
	className?: string;
	isSelected?: boolean;
};

enum DueStatus {
	DueSoon = "Due soon",
	Overdue = "Overdue",
}

export function BorrowedItem(props: Props): JSX.Element {
	const equipmentImage = props.item.equipment.imageUrl
		? `${BACKEND_URL}${props.item.equipment.imageUrl}`
		: "https://arthurmillerfoundation.org/wp-content/uploads/2018/06/default-placeholder.png";

	function getDueStatus(returnDate: Date): DueStatus | null {
		const now = new Date();
		const diff = differenceInMinutes(returnDate, now);
		const isOverdue = isAfter(now, returnDate);

		if (diff <= 30 && diff >= 0) {
			return DueStatus.DueSoon;
		}

		if (isOverdue) {
			return DueStatus.Overdue;
		}

		return null;
	}

	function stopPropagation(event: React.MouseEvent): void {
		event.stopPropagation();
	}

	const dueStatus = getDueStatus(new Date(props.transaction.expectedReturnAt));

	return (
		<div
			className={cn(
				"flex items-center gap-2 justify-between bg-card rounded-2xl p-4 shadow-item",
				props.className,
			)}
		>
			<div className="flex items-center gap-2 w-full">
				<img
					src={equipmentImage}
					alt={`${props.item.equipment.name} ${props.item.equipment.brand}`}
					className="size-16 object-cover"
				/>

				<div className="flex flex-col w-full">
					<LabelLarge>
						{props.item.equipment.brand}
						{props.item.equipment.model ? ` ${props.item.equipment.model}` : null}
					</LabelLarge>

					<LabelSmall className="text-muted group-has-data-[state=checked]:text-primary-foreground">
						Due: {format(props.transaction.expectedReturnAt, "h:mm a")} on{" "}
						{format(props.transaction.expectedReturnAt, "MM/dd/yyyy")}
					</LabelSmall>

					{dueStatus && (
						<Badge
							className="mt-1"
							variant={
								dueStatus === DueStatus.DueSoon ? "secondary" : "warning"
							}
						>
							Status: {dueStatus}
						</Badge>
					)}
				</div>
			</div>

			<NumberInput
				isDisabled={!props.isSelected}
				className="w-40"
				defaultValue={1}
				maxValue={props.item.equipment.quantity}
				onClick={stopPropagation}
				onPointerDown={stopPropagation}
				onChange={(v) => props.handleUpdateQuantity(props.item, v)}
			/>
		</div>
	);
}
